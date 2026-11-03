export const ACCESS_PROFILE_DEFINITIONS = [
  {
    key: 'STUDENT',
    name: 'Estudante',
    description: 'Perfil de acesso de estudante.',
  },
  {
    key: 'LIBRARY',
    name: 'Biblioteca',
    description: 'Perfil de acesso da biblioteca.',
  },
  {
    key: 'XEROX',
    name: 'Xerox',
    description: 'Perfil de acesso da xerox.',
  },
  {
    key: 'ADMIN',
    name: 'Administrador',
    description: 'Perfil de acesso administrativo.',
  },
] as const;

export const ACCESS_PROFILE_KEYS = ACCESS_PROFILE_DEFINITIONS.map(
  (profile) => profile.key,
);

export type AccessProfileKey = (typeof ACCESS_PROFILE_DEFINITIONS)[number]['key'];