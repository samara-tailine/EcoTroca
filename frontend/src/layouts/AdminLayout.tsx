import { AppShell } from "./AppShell";
export function AdminLayout() {
  return (
    <AppShell
      area="Manutenção técnica"
      profile="ADMIN"
      home="/admin/categories"
      items={[
        { to: "/admin/users", label: "Usuários", icon: "user" },
        { to: "/admin/categories", label: "Categorias", icon: "layers" },
        { to: "/admin/equipment", label: "Equipamentos", icon: "equipment" },
      ]}
    />
  );
}
