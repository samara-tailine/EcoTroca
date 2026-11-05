export function Brand() {
  const logoUrl =
    import.meta.env.VITE_LOGO_URL ??
    `${import.meta.env.BASE_URL}imagens/logo_ecotroca.jpeg`;

  return (
    <span className="brand">
      <img
        src={logoUrl}
        className="brand-original"
        alt="EcoTroca"
        decoding="async"
      />
    </span>
  );
}
