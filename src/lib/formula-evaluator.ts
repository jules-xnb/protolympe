import type { FieldDefinitionWithRelations } from '@/hooks/useFieldDefinitions';

/**
 * Evaluate a calculated field formula against a set of field values.
 *
 * Formulas use `{slug}` to reference other fields and support:
 * - Arithmetic: +, -, *, /
 * - Comparisons: ==, !=, >, <, >=, <=
 * - Functions: concat, si, et, ou, non, vide, somme, moyenne, min, max, abs,
 *   arrondi, majuscule, minuscule, longueur, texte, nombre, decimal, entier
 */
export function evaluateFormula(
  formula: string | null | undefined,
  fieldValues: Record<string, unknown>,
  fields: FieldDefinitionWithRelations[],
): unknown {
  if (!formula || !formula.trim()) return null;

  // Build slug → value map
  const slugToValue = new Map<string, unknown>();
  for (const field of fields) {
    const raw = fieldValues[field.id];
    // Unwrap JSONB { value } wrapper
    const val =
      raw !== null &&
      raw !== undefined &&
      typeof raw === 'object' &&
      !Array.isArray(raw) &&
      (raw as Record<string, unknown>).value !== undefined
        ? (raw as Record<string, unknown>).value
        : raw;
    slugToValue.set(field.slug, val ?? null);
  }

  try {
    // Replace field references with their values, then evaluate
    const resolved = formula.replace(/\{([^}]+)\}/g, (_, slug: string) => {
      const val = slugToValue.get(slug);
      if (val === null || val === undefined) return 'null';
      if (typeof val === 'string') return JSON.stringify(val);
      return String(val);
    });

    return evalExpression(resolved);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type Token =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma' }
  | { type: 'null' };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    // Whitespace
    if (/\s/.test(ch)) { i++; continue; }

    // String literal
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let str = '';
      i++;
      while (i < expr.length && expr[i] !== quote) {
        if (expr[i] === '\\' && i + 1 < expr.length) { str += expr[i + 1]; i += 2; }
        else { str += expr[i]; i++; }
      }
      i++; // closing quote
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Number
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < expr.length && /[0-9]/.test(expr[i + 1]))) {
      let num = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) { num += expr[i]; i++; }
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }

    // Multi-char operators
    if (i + 1 < expr.length) {
      const two = ch + expr[i + 1];
      if (['==', '!=', '>=', '<='].includes(two)) {
        tokens.push({ type: 'op', value: two });
        i += 2;
        continue;
      }
    }

    // Single-char operators
    if ('+-*/><!'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    // Parens
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }

    // Comma
    if (ch === ',') {
      tokens.push({ type: 'comma' });
      i++;
      continue;
    }

    // Identifier (function name or keyword)
    if (/[a-zA-Zàâäéèêëïîôùûüÿç_]/.test(ch)) {
      let ident = '';
      while (i < expr.length && /[a-zA-Z0-9àâäéèêëïîôùûüÿç_]/.test(expr[i])) {
        ident += expr[i]; i++;
      }
      if (ident === 'null') tokens.push({ type: 'null' });
      else if (ident === 'true') tokens.push({ type: 'number', value: 1 });
      else if (ident === 'false') tokens.push({ type: 'number', value: 0 });
      else tokens.push({ type: 'ident', value: ident.toLowerCase() });
      continue;
    }

    // Skip unknown
    i++;
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Recursive descent parser/evaluator
// ---------------------------------------------------------------------------

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private advance(): Token { return this.tokens[this.pos++]; }

  parse(): unknown {
    const result = this.parseComparison();
    return result;
  }

  private parseComparison(): unknown {
    let left = this.parseAddSub();
    while (this.peek()?.type === 'op' && ['==', '!=', '>', '<', '>=', '<='].includes(this.peek()!.value as string)) {
      const op = (this.advance() as { value: string }).value;
      const right = this.parseAddSub();
      left = this.evalComparison(op, left, right);
    }
    return left;
  }

  private parseAddSub(): unknown {
    let left = this.parseMulDiv();
    while (this.peek()?.type === 'op' && ['+', '-'].includes(this.peek()!.value as string)) {
      const op = (this.advance() as { value: string }).value;
      const right = this.parseMulDiv();
      const l = toNumber(left), r = toNumber(right);
      left = op === '+' ? l + r : l - r;
    }
    return left;
  }

  private parseMulDiv(): unknown {
    let left = this.parseUnary();
    while (this.peek()?.type === 'op' && ['*', '/'].includes(this.peek()!.value as string)) {
      const op = (this.advance() as { value: string }).value;
      const right = this.parseUnary();
      const l = toNumber(left), r = toNumber(right);
      left = op === '*' ? l * r : (r !== 0 ? l / r : 0);
    }
    return left;
  }

  private parseUnary(): unknown {
    if (this.peek()?.type === 'op' && this.peek()!.value === '-') {
      this.advance();
      return -toNumber(this.parsePrimary());
    }
    return this.parsePrimary();
  }

  private parsePrimary(): unknown {
    const tok = this.peek();
    if (!tok) return null;

    if (tok.type === 'null') { this.advance(); return null; }
    if (tok.type === 'number') { this.advance(); return tok.value; }
    if (tok.type === 'string') { this.advance(); return tok.value; }

    // Function call
    if (tok.type === 'ident') {
      const name = tok.value;
      this.advance();
      if (this.peek()?.type === 'paren' && this.peek()!.value === '(') {
        this.advance(); // (
        const args: unknown[] = [];
        if (!(this.peek()?.type === 'paren' && this.peek()!.value === ')')) {
          args.push(this.parseComparison());
          while (this.peek()?.type === 'comma') {
            this.advance();
            args.push(this.parseComparison());
          }
        }
        if (this.peek()?.type === 'paren' && this.peek()!.value === ')') this.advance();
        return evalFunction(name, args);
      }
      // Bare identifier — treat as null
      return null;
    }

    // Parenthesized expression
    if (tok.type === 'paren' && tok.value === '(') {
      this.advance();
      const val = this.parseComparison();
      if (this.peek()?.type === 'paren' && this.peek()!.value === ')') this.advance();
      return val;
    }

    this.advance();
    return null;
  }

  private evalComparison(op: string, left: unknown, right: unknown): boolean {
    const l = toNumber(left), r = toNumber(right);
    switch (op) {
      case '==': return left === right || l === r;
      case '!=': return left !== right && l !== r;
      case '>': return l > r;
      case '<': return l < r;
      case '>=': return l >= r;
      case '<=': return l <= r;
      default: return false;
    }
  }
}

function evalExpression(expr: string): unknown {
  const tokens = tokenize(expr);
  if (tokens.length === 0) return null;
  const parser = new Parser(tokens);
  return parser.parse();
}

// ---------------------------------------------------------------------------
// Built-in functions
// ---------------------------------------------------------------------------

function evalFunction(name: string, args: unknown[]): unknown {
  switch (name) {
    // Logic
    case 'si': return isTruthy(args[0]) ? args[1] : args[2];
    case 'et': return args.every(isTruthy);
    case 'ou': return args.some(isTruthy);
    case 'non': return !isTruthy(args[0]);
    case 'vide': return args[0] === null || args[0] === undefined || args[0] === '';

    // Math
    case 'somme': return args.reduce((s: number, v) => s + toNumber(v), 0);
    case 'moyenne': { const nums = args.map(toNumber); return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0; }
    case 'min': return Math.min(...args.map(toNumber));
    case 'max': return Math.max(...args.map(toNumber));
    case 'abs': return Math.abs(toNumber(args[0]));
    case 'arrondi': return parseFloat(toNumber(args[0]).toFixed(toNumber(args[1] ?? 0)));

    // Text
    case 'concat': return args.map(a => a === null || a === undefined ? '' : String(a)).join('');
    case 'majuscule': return String(args[0] ?? '').toUpperCase();
    case 'minuscule': return String(args[0] ?? '').toLowerCase();
    case 'longueur': return String(args[0] ?? '').length;

    // Date
    case 'maintenant': return new Date().toISOString();
    case 'aujourdhui': return new Date().toISOString().slice(0, 10);
    case 'diff_jours': {
      const d1 = new Date(String(args[0])), d2 = new Date(String(args[1]));
      return Math.round((d2.getTime() - d1.getTime()) / 86400000);
    }

    // Conversion
    case 'texte': return args[0] === null || args[0] === undefined ? '' : String(args[0]);
    case 'nombre': return Math.round(toNumber(args[0]));
    case 'decimal': return toNumber(args[0]);
    case 'entier': return Math.floor(toNumber(args[0]));
    case 'booleen': return isTruthy(args[0]);
    case 'date': return args[0] ? new Date(String(args[0])).toISOString().slice(0, 10) : null;
    case 'format_date': {
      try {
        const d = new Date(String(args[0]));
        const fmt = String(args[1] ?? 'dd/MM/yyyy');
        return fmt
          .replace('dd', String(d.getDate()).padStart(2, '0'))
          .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
          .replace('yyyy', String(d.getFullYear()));
      } catch { return String(args[0]); }
    }

    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function isTruthy(v: unknown): boolean {
  if (v === null || v === undefined || v === '' || v === 0 || v === false) return false;
  return true;
}
