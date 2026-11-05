// As chaves internas são preservadas. Rótulos em pt-BR também atendem sessões antigas.
const labels: Record<string, string> = {
  STUDENT: "Estudante",
  LIBRARY: "Administrador da Biblioteca",
  XEROX: "Administrador da Xerox",
  ADMIN: "Administrador técnico",
};

export function profileLabel(key: string): string {
  return labels[key] ?? "Perfil não reconhecido";
}
