export function canUseXerox(roles: readonly string[]): boolean {
  return (
    roles.includes("XEROX") &&
    !roles.includes("ADMIN") &&
    !roles.includes("LIBRARY")
  );
}
