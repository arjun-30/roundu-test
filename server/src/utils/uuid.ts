const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id: any): boolean {
  if (typeof id !== 'string') return false;
  return UUID_REGEX.test(id);
}
