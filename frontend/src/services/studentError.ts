import axios from "axios";

export function studentError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    if (
      error instanceof Error &&
      [
        "Solicitação não encontrada.",
        "Carteira não encontrada.",
        "Acesso de estudante necessário.",
      ].includes(error.message)
    )
      return error.message;
    return "Não foi possível concluir a operação. Tente novamente.";
  }
  if (!error.response)
    return "Não foi possível conectar à API. Verifique sua conexão e tente novamente.";
  if (error.response.status === 401)
    return "Sua sessão expirou. Entre novamente para continuar.";
  if (error.response.status === 403)
    return "Seu perfil não tem permissão para acessar este recurso.";
  if (error.response.status === 404)
    return "O recurso solicitado não foi encontrado.";
  const message: unknown = error.response.data?.message;
  if ([400, 409].includes(error.response.status)) {
    if (typeof message === "string") return message;
    if (
      Array.isArray(message) &&
      message.every((item) => typeof item === "string")
    )
      return message.join(" ");
  }
  return "Não foi possível concluir a operação agora. Tente novamente em instantes.";
}
