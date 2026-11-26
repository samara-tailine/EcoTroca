import { AppShell } from "./AppShell";
export function XeroxLayout() {
  return (
    <AppShell
      area="Área da Xerox"
      profile="XEROX"
      home="/xerox/payments"
      items={[
        {
          to: "/xerox/payments",
          label: "Pagamentos recebidos",
          icon: "receipt",
        },
      ]}
    />
  );
}
