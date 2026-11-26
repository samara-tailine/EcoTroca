import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { profileLabel } from "../auth/profileLabels";
import { Brand } from "../components/Brand";
import { EcoBanner } from "../components/EcoBanner";
import { Icon } from "../components/Icon";
import type { IconName } from "../components/Icon";

export interface ShellNavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}
export function AppShell({
  area,
  profile,
  home,
  items,
}: {
  area: string;
  profile: string;
  home: string;
  items: ShellNavItem[];
}) {
  const { session, logout } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const current =
    [...items]
      .sort((a, b) => b.to.length - a.to.length)
      .find((item) =>
        item.end ? pathname === item.to : pathname.startsWith(item.to),
      )?.label ?? area;
  const name = session?.user.name ?? "";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggle.current?.focus();
      }
    }
    if (menuOpen) document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [menuOpen]);
  return (
    <div className={`admin-shell ${profile.toLowerCase()}-shell`}>
      <a className="skip-link" href="#workspace-main">
        Ir para o conteúdo
      </a>
      {menuOpen && (
        <button
          type="button"
          className="menu-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
          tabIndex={-1}
        />
      )}
      <aside className={`admin-sidebar ${menuOpen ? "open" : ""}`}>
        <Link
          to={home}
          className="sidebar-brand"
          aria-label={`EcoTroca — ${area}`}
          onClick={() => setMenuOpen(false)}
        >
          <Brand variant="menu" />
        </Link>
        <nav id="workspace-navigation" aria-label={`Menu: ${area}`}>
          <p className="sidebar-label">{area}</p>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
          <p className="sidebar-label sidebar-account-label">MINHA CONTA</p>
          <NavLink to="/" onClick={() => setMenuOpen(false)}>
            <Icon name="user" />
            Dados da conta
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <Icon name="leaf" />
          <p>
            Pequenas atitudes.
            <br />
            <strong>Um futuro mais verde.</strong>
          </p>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-header">
          <div className="flex items-center gap-3 min-w-0">
            <button
              ref={toggle}
              type="button"
              className="menu-toggle"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              aria-controls="workspace-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Icon name={menuOpen ? "close" : "menu"} />
            </button>
            <div>
              <p className="header-area">{area}</p>
              <p className="header-breadcrumb">
                EcoTroca <span aria-hidden="true">/</span> {current}
              </p>
            </div>
          </div>
          <div className="header-account">
            <span className="user-avatar" aria-hidden="true">
              {initials}
            </span>
            <div className="header-user">
              <strong>{name}</strong>
              <span>{profileLabel(profile)}</span>
            </div>
            <button
              className="secondary-button shell-logout"
              type="button"
              onClick={logout}
            >
              <Icon name="logout" />
              <span>Sair</span>
            </button>
          </div>
        </header>
        <main id="workspace-main" className="admin-main" tabIndex={-1}>
          <EcoBanner />
          <Outlet key={session?.user.id} />
        </main>
        <footer className="admin-footer">
          <strong>EcoTroca</strong>
          <span>Conexões que renovam.</span>
        </footer>
      </div>
    </div>
  );
}
