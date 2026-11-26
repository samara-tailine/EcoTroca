import { useLocation } from "react-router";

export function Brand({
  variant = "default",
}: {
  variant?: "default" | "menu";
}) {
  const isLogin = useLocation().pathname === "/login";
  const isMenu = !isLogin && variant === "menu";
  // A imagem colorida e sua configuração opcional permanecem exclusivas do login.
  const logoUrl = isLogin
    ? (import.meta.env.VITE_LOGO_URL ??
      `${import.meta.env.BASE_URL}imagens/logo_ecotroca_transparente.png`)
    : `${import.meta.env.BASE_URL}imagens/${isMenu ? "logo_ecotroca_menu_transparente.png" : "logo_ecotroca_sem_slogan.png"}`;

  return (
    <span
      className="brand"
      data-brand-variant={isLogin ? "login" : isMenu ? "menu" : "internal"}
    >
      <img
        src={logoUrl}
        className="brand-original"
        alt="EcoTroca"
        decoding="async"
      />
    </span>
  );
}
