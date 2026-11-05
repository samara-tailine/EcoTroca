export const ACCESS_PROFILE_DEFINITIONS = [
  {
    key: 'STUDENT',
    name: 'Estudante',
    description: 'Solicita descartes, acompanha suas solicitações e utiliza seus EcoCoins.',
  },
  {
    key: 'LIBRARY',
    name: 'Administrador da Biblioteca',
    description: 'Recebe e confere equipamentos, aprova descartes e concede EcoCoins aos estudantes.',
  },
  {
    key: 'XEROX',
    name: 'Administrador da Xerox',
    description: 'Recebe EcoCoins em resgates e debita o saldo dos estudantes.',
  },
  {
    key: 'ADMIN',
    name: 'Administrador técnico',
    description: 'Perfil técnico reservado à manutenção do sistema, sem herdar permissões operacionais da Biblioteca ou da Xerox.',
  },
] as const;

export const ACCESS_PROFILE_KEYS = ACCESS_PROFILE_DEFINITIONS.map((profile) => profile.key);
export type AccessProfileKey = (typeof ACCESS_PROFILE_DEFINITIONS)[number]['key'];