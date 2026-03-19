import { useState, useRef, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Chip } from '@/components/ui/chip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Hash, Type, Calendar, ToggleLeft, Search, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FieldDefinitionWithRelations } from '@/hooks/useFieldDefinitions';

const FORMULA_FUNCTIONS = [
  { name: 'si', syntax: 'si(condition, valeur_si_vrai, valeur_si_faux)', description: 'Condition logique', category: 'Logique' },
  { name: 'et', syntax: 'et(condition1, condition2)', description: 'Toutes les conditions vraies', category: 'Logique' },
  { name: 'ou', syntax: 'ou(condition1, condition2)', description: 'Au moins une condition vraie', category: 'Logique' },
  { name: 'non', syntax: 'non(condition)', description: 'Inverse la condition', category: 'Logique' },
  { name: 'somme', syntax: 'somme(champ1, champ2, ...)', description: 'Additionne les valeurs', category: 'Mathématiques' },
  { name: 'moyenne', syntax: 'moyenne(champ1, champ2, ...)', description: 'Moyenne des valeurs', category: 'Mathématiques' },
  { name: 'min', syntax: 'min(champ1, champ2)', description: 'Valeur minimale', category: 'Mathématiques' },
  { name: 'max', syntax: 'max(champ1, champ2)', description: 'Valeur maximale', category: 'Mathématiques' },
  { name: 'abs', syntax: 'abs(nombre)', description: 'Valeur absolue', category: 'Mathématiques' },
  { name: 'arrondi', syntax: 'arrondi(nombre, decimales)', description: 'Arrondit un nombre', category: 'Mathématiques' },
  { name: 'concat', syntax: 'concat(texte1, texte2, ...)', description: 'Concatène des textes', category: 'Texte' },
  { name: 'majuscule', syntax: 'majuscule(texte)', description: 'Convertit en majuscules', category: 'Texte' },
  { name: 'minuscule', syntax: 'minuscule(texte)', description: 'Convertit en minuscules', category: 'Texte' },
  { name: 'longueur', syntax: 'longueur(texte)', description: 'Nombre de caractères', category: 'Texte' },
  { name: 'maintenant', syntax: 'maintenant()', description: 'Date et heure actuelles', category: 'Date' },
  { name: 'aujourdhui', syntax: 'aujourdhui()', description: 'Date du jour', category: 'Date' },
  { name: 'diff_jours', syntax: 'diff_jours(date1, date2)', description: 'Différence en jours', category: 'Date' },
  { name: 'vide', syntax: 'vide(champ)', description: 'Vrai si le champ est vide', category: 'Logique' },
  { name: 'texte', syntax: 'texte(valeur)', description: 'Convertit en texte', category: 'Conversion' },
  { name: 'nombre', syntax: 'nombre(valeur)', description: 'Convertit en nombre', category: 'Conversion' },
  { name: 'decimal', syntax: 'decimal(valeur)', description: 'Convertit en décimal', category: 'Conversion' },
  { name: 'entier', syntax: 'entier(valeur)', description: 'Partie entière', category: 'Conversion' },
  { name: 'booleen', syntax: 'booleen(valeur)', description: 'Convertit en vrai/faux', category: 'Conversion' },
  { name: 'date', syntax: 'date(valeur)', description: 'Convertit en date', category: 'Conversion' },
  { name: 'format_date', syntax: 'format_date(date, "dd/MM/yyyy")', description: 'Formate une date en texte', category: 'Conversion' },
];

const FIELD_TYPE_ICONS: Record<string, typeof Hash> = {
  number: Hash,
  decimal: Hash,
  text: Type,
  textarea: Type,
  email: Type,
  phone: Type,
  url: Type,
  date: Calendar,
  datetime: Calendar,
  time: Calendar,
  checkbox: ToggleLeft,
  select: Type,
  multiselect: Type,
};

// --- Formula analysis ---

type OutputType = 'nombre' | 'décimal' | 'texte' | 'booléen' | 'date' | 'date/heure' | 'heure' | 'inconnu';

const FUNCTION_RETURN_TYPES: Record<string, OutputType> = {
  si: 'inconnu', // depends on branches
  et: 'booléen',
  ou: 'booléen',
  non: 'booléen',
  vide: 'booléen',
  somme: 'nombre',
  moyenne: 'décimal',
  min: 'nombre',
  max: 'nombre',
  abs: 'nombre',
  arrondi: 'nombre',
  concat: 'texte',
  majuscule: 'texte',
  minuscule: 'texte',
  longueur: 'nombre',
  maintenant: 'date/heure',
  aujourdhui: 'date',
  diff_jours: 'nombre',
  texte: 'texte',
  nombre: 'nombre',
  decimal: 'décimal',
  entier: 'nombre',
  booleen: 'booléen',
  date: 'date',
  format_date: 'texte',
};

const KNOWN_FUNCTION_NAMES = new Set(FORMULA_FUNCTIONS.map(f => f.name));

const FIELD_TYPE_TO_OUTPUT: Record<string, OutputType> = {
  text: 'texte',
  textarea: 'texte',
  email: 'texte',
  phone: 'texte',
  url: 'texte',
  number: 'nombre',
  decimal: 'décimal',
  date: 'date',
  datetime: 'date/heure',
  time: 'heure',
  checkbox: 'booléen',
  select: 'texte',
  multiselect: 'texte',
};

interface FormulaAnalysis {
  outputType: OutputType | null;
  errors: string[];
}

function analyzeFormula(
  formula: string,
  fieldsBySlug: Map<string, FieldDefinitionWithRelations>,
): FormulaAnalysis {
  const trimmed = formula.trim();
  if (!trimmed) return { outputType: null, errors: [] };

  const errors: string[] = [];

  // Check parentheses balance
  let depth = 0;
  let inString = false;
  let stringChar = '';
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inString) {
      if (ch === stringChar && trimmed[i - 1] !== '\\') inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) {
      errors.push('Parenthèse fermante sans ouverture correspondante');
      break;
    }
  }
  if (inString) errors.push('Guillemet non fermé');
  if (depth > 0) errors.push(`${depth} parenthèse(s) non fermée(s)`);

  // Check field references
  const fieldRefPattern = /\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = fieldRefPattern.exec(trimmed)) !== null) {
    const slug = match[1];
    if (!fieldsBySlug.has(slug)) {
      errors.push(`Champ inconnu : {${slug}}`);
    }
  }

  // Check function names
  const funcPattern = /([a-zA-Zàâäéèêëïîôùûüÿç_][a-zA-Z0-9àâäéèêëïîôùûüÿç_]*)\s*\(/g;
  const foundFunctions: string[] = [];
  while ((match = funcPattern.exec(trimmed)) !== null) {
    const fnName = match[1].toLowerCase();
    foundFunctions.push(fnName);
    if (!KNOWN_FUNCTION_NAMES.has(fnName)) {
      errors.push(`Fonction inconnue : ${match[1]}()`);
    }
  }

  // Infer output type
  let outputType: OutputType | null = null;

  // Check if formula has comparison operators at top level (outside function calls)
  const hasTopLevelComparison = /[^=!<>](==|!=|>=|<=|>(?!=)|<(?!=))[^=]/.test(trimmed) || /^(==|!=|>=|<=|>|<)/.test(trimmed);

  if (foundFunctions.length > 0) {
    // Find the outermost function (first function call that isn't nested)
    const outerFuncMatch = /^([a-zA-Zàâäéèêëïîôùûüÿç_][a-zA-Z0-9àâäéèêëïîôùûüÿç_]*)\s*\(/.exec(trimmed);
    if (outerFuncMatch) {
      const fnName = outerFuncMatch[1].toLowerCase();
      outputType = FUNCTION_RETURN_TYPES[fnName] || null;
    } else if (hasTopLevelComparison) {
      outputType = 'booléen';
    } else {
      // Expression with functions but not starting with one — check for arithmetic
      const hasArithmetic = /[+\-*/]/.test(trimmed.replace(/\{[^}]*\}/g, '').replace(/"[^"]*"/g, '').replace(/'[^']*'/g, ''));
      if (hasArithmetic) outputType = 'nombre';
    }
  } else if (hasTopLevelComparison) {
    outputType = 'booléen';
  } else {
    // Pure field reference?
    const singleFieldMatch = /^\{([^}]+)\}$/.exec(trimmed);
    if (singleFieldMatch) {
      const field = fieldsBySlug.get(singleFieldMatch[1]);
      if (field) {
        outputType = FIELD_TYPE_TO_OUTPUT[field.field_type] || 'texte';
      }
    } else {
      // Arithmetic expression with fields
      const stripped = trimmed.replace(/\{[^}]*\}/g, '').replace(/\s+/g, '').replace(/[0-9.]+/g, '');
      if (/^[+\-*/()]+$/.test(stripped) || stripped === '') {
        outputType = 'nombre';
      }
    }
  }

  // Detect number literal
  if (!outputType && /^[0-9.]+$/.test(trimmed)) {
    outputType = trimmed.includes('.') ? 'décimal' : 'nombre';
  }

  // Detect string literal
  if (!outputType && (/^"[^"]*"$/.test(trimmed) || /^'[^']*'$/.test(trimmed))) {
    outputType = 'texte';
  }

  return { outputType, errors };
}

const OUTPUT_TYPE_LABELS: Record<OutputType, { label: string; color: string }> = {
  nombre: { label: 'Nombre', color: 'text-blue-600' },
  décimal: { label: 'Décimal', color: 'text-blue-600' },
  texte: { label: 'Texte', color: 'text-emerald-600' },
  booléen: { label: 'Booléen', color: 'text-purple-600' },
  date: { label: 'Date', color: 'text-orange-600' },
  'date/heure': { label: 'Date/Heure', color: 'text-orange-600' },
  heure: { label: 'Heure', color: 'text-orange-600' },
  inconnu: { label: 'Variable', color: 'text-muted-foreground' },
};

interface FormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
  fields: FieldDefinitionWithRelations[];
  currentFieldId?: string;
}

export function FormulaEditor({ value, onChange, fields, currentFieldId }: FormulaEditorProps) {
  const [search, setSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const availableFields = fields.filter(
    (f) => f.id !== currentFieldId
  );

  const fieldsBySlug = useMemo(() => {
    const map = new Map<string, FieldDefinitionWithRelations>();
    availableFields.forEach(f => map.set(f.slug, f));
    return map;
  }, [availableFields]);

  const analysis = useMemo(() => analyzeFormula(value, fieldsBySlug), [value, fieldsBySlug]);

  const insertAtCursor = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + text);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + text + value.substring(end);
    onChange(newValue);
    // Restore cursor position after insertion
    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + text.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }, [value, onChange]);

  const insertField = (field: FieldDefinitionWithRelations) => {
    insertAtCursor(`{${field.slug}}`);
  };

  const insertFunction = (fn: typeof FORMULA_FUNCTIONS[0]) => {
    insertAtCursor(fn.syntax);
  };

  const filteredFields = availableFields.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.slug.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFunctions = FORMULA_FUNCTIONS.filter((fn) =>
    fn.name.toLowerCase().includes(search.toLowerCase()) ||
    fn.description.toLowerCase().includes(search.toLowerCase())
  );

  const groupedFunctions = filteredFunctions.reduce((acc, fn) => {
    if (!acc[fn.category]) acc[fn.category] = [];
    acc[fn.category].push(fn);
    return acc;
  }, {} as Record<string, typeof FORMULA_FUNCTIONS>);

  return (
    <div className="space-y-3">
      {/* Formula input */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex: si(vide({montant}), 0, {montant} * {taux_tva})"
          className="font-mono text-sm min-h-[80px] resize-y"
          rows={3}
        />
      </div>

      {/* Formula analysis feedback */}
      {value.trim() && (
        <div className="space-y-1.5">
          {analysis.errors.length > 0 && (
            <div className="flex flex-col gap-1">
              {analysis.errors.map((err, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}
          {analysis.errors.length === 0 && analysis.outputType && (
            <div className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              <span className="text-muted-foreground">Type de sortie :</span>
              <span className={`font-medium ${OUTPUT_TYPE_LABELS[analysis.outputType].color}`}>
                {OUTPUT_TYPE_LABELS[analysis.outputType].label}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Reference panel */}
      <div className="border rounded-lg overflow-hidden bg-muted/30">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un champ ou une fonction..."
              className="w-full pl-7 pr-2 py-1.5 text-sm bg-transparent border-0 outline-none shadow-none placeholder:text-muted-foreground h-auto"
            />
          </div>
        </div>

        <Tabs defaultValue="fields" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="fields">
              Champs ({filteredFields.length})
            </TabsTrigger>
            <TabsTrigger value="functions">
              Fonctions ({filteredFunctions.length})
            </TabsTrigger>
            <TabsTrigger value="operators">
              Opérateurs
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[180px]">
            <TabsContent value="fields" className="m-0 p-1">
              {filteredFields.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Aucun champ disponible
                </p>
              ) : (
                <div className="space-y-0.5">
                  {filteredFields.map((field) => {
                    const Icon = FIELD_TYPE_ICONS[field.field_type] || Type;
                    return (
                      <Button
                        key={field.id}
                        type="button"
                        variant="ghost"
                        onClick={() => insertField(field)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 h-auto text-left rounded hover:bg-accent transition-colors group justify-start"
                      >
                        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate flex-1">{field.name}</span>
                        {field.is_system && (
                          <Chip variant="outline" className="text-[10px] h-4 px-1.5 shrink-0 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 gap-0.5">
                            <Lock className="h-2.5 w-2.5" />
                            Système
                          </Chip>
                        )}
                        <code className="text-xs text-muted-foreground font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                          {`{${field.slug}}`}
                        </code>
                      </Button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="functions" className="m-0 p-1">
              {Object.entries(groupedFunctions).map(([category, fns]) => (
                <div key={category} className="mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    {category}
                  </p>
                  {fns.map((fn) => (
                    <Button
                      key={fn.name}
                      type="button"
                      variant="ghost"
                      onClick={() => insertFunction(fn)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 h-auto text-left rounded hover:bg-accent transition-colors group justify-start"
                    >
                      <Chip variant="outline" className="text-xs font-mono h-5 shrink-0">
                        {fn.name}
                      </Chip>
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        {fn.description}
                      </span>
                    </Button>
                  ))}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="operators" className="m-0 p-2">
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '+', desc: 'Addition' },
                  { label: '-', desc: 'Soustraction' },
                  { label: '*', desc: 'Multiplication' },
                  { label: '/', desc: 'Division' },
                  { label: '==', desc: 'Égal' },
                  { label: '!=', desc: 'Différent' },
                  { label: '>', desc: 'Supérieur' },
                  { label: '<', desc: 'Inférieur' },
                  { label: '>=', desc: 'Sup. ou égal' },
                  { label: '<=', desc: 'Inf. ou égal' },
                  { label: '(', desc: 'Parenthèse' },
                  { label: ')', desc: 'Parenthèse' },
                ].map((op) => (
                  <Button
                    key={op.label + op.desc}
                    type="button"
                    variant="outline"
                    onClick={() => insertAtCursor(` ${op.label} `)}
                    className="flex flex-col items-center gap-0.5 px-2 py-2 h-auto rounded"
                    title={op.desc}
                  >
                    <code className="text-sm font-mono font-semibold">{op.label}</code>
                    <span className="text-xs text-muted-foreground">{op.desc}</span>
                  </Button>
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}
