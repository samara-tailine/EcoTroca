import axios from "axios";

export function apiError(error: unknown): string {
  if (!axios.isAxiosError(error))
    return "Não foi possível concluir a operação. Tente novamente.";
  if (!error.response)
    return "Não foi possível conectar à API. Verifique sua conexão e tente novamente.";
  const message = error.response.data?.message;
  if (
    typeof message === "string" &&
    (message.startsWith("O peso oficial") ||
      message.startsWith("Um equipamento oficial"))
  )
    return message;
  switch (error.response.status) {
    case 400:
      return "Confira os campos informados. Utilize uma categoria ativa e um peso inteiro entre 1 e 1.000.000 g.";
    case 401:
      return "Sua sessão expirou. Entre novamente.";
    case 403:
      return "Acesso negado. Esta operação exige o perfil de administrador técnico.";
    case 404:
      return "O registro não foi encontrado. Atualize a lista e tente novamente.";
    case 409:
      return "Este nome já está em uso. Equipamentos devem ter nomes únicos dentro da mesma categoria.";
    default:
      return "Não foi possível concluir a operação. Tente novamente em instantes.";
  }
}
