export interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  if (password.length < 12) errors.push('Minimum 12 caractères');
  if (!/[A-Z]/.test(password)) errors.push('Au moins une majuscule');
  if (!/[a-z]/.test(password)) errors.push('Au moins une minuscule');
  if (!/[0-9]/.test(password)) errors.push('Au moins un chiffre');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Au moins un caractère spécial');
  return { valid: errors.length === 0, errors };
}
