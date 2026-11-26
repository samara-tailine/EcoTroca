import { AppShell } from "./AppShell";
import { useAuth } from "../auth/AuthContext";
import { canPay } from "../auth/paymentPermission";
import type { ShellNavItem } from "./AppShell";
export function StudentLayout() {
  const { session } = useAuth();
  const items: ShellNavItem[] = [
    { to: "/student", label: "Visão geral", icon: "home", end: true },
    ...(canPay(session?.user.accessProfiles.map((p) => p.key) ?? [])
      ? [
          {
            to: "/student/payments/new",
            label: "Enviar EcoCoin",
            icon: "send" as const,
          },
        ]
      : []),
    {
      to: "/student/disposals/new",
      label: "Solicitar descarte",
      icon: "recycle",
    },
    {
      to: "/student/disposals",
      label: "Meus descartes",
      icon: "layers",
      end: true,
    },
    { to: "/student/ecocoins", label: "Meus EcoCoins", icon: "wallet" },
  ];
  return (
    <AppShell
      area="Área do estudante"
      profile="STUDENT"
      home="/student"
      items={items}
    />
  );
}
