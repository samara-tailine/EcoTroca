export function canPay(roles: readonly string[]): boolean {
  return (
    roles.includes("STUDENT") &&
    !roles.some((role) => ["ADMIN", "LIBRARY", "XEROX"].includes(role))
  );
}
