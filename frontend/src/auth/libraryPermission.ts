export function canUseLibrary(roles: readonly string[]): boolean {
  return (
    roles.includes("LIBRARY") &&
    !roles.includes("ADMIN") &&
    !roles.includes("XEROX")
  );
}
