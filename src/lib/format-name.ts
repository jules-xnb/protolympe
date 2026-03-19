/** Build display name from first_name + last_name, with fallback */
export function formatFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallback = 'Sans nom'
): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : fallback;
}
