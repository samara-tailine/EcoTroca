import { AppShell } from "./AppShell";
export function LibraryLayout() {
  return (
    <AppShell
      area="Área da Biblioteca"
      profile="LIBRARY"
      home="/library/disposals"
      items={[
        {
          to: "/library/disposals",
          label: "Fila de descartes",
          icon: "recycle",
        },
        {
          to: "/library/credits",
          label: "Créditos de EcoCoins",
          icon: "wallet",
        },
      ]}
    />
  );
}
