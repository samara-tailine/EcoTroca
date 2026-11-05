import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { Brand } from "../components/Brand";

export function AdminLayout() {
  const { session, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const pageName = pathname.includes("/equipment")
    ? "Equipamentos"
    : "Categorias";
  const initials = session?.user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join("");

  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-main">
        Ir para o conteúdo
      </a>
      <aside className={`admin-sidebar ${menuOpen ? "open" : ""}`}>
        <Link
          to="/admin/categories"
          className="sidebar-brand"
          aria-label="EcoTroca — manutenção técnica"
          onClick={() => setMenuOpen(false)}
        >
          <Brand />
        </Link>
        <nav id="admin-navigation" aria-label="Menu de manutenção técnica">
          <p className="sidebar-label">MANUTENÇÃO DO CATÁLOGO</p>
          <NavLink to="/admin/categories" onClick={() => setMenuOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3V7Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
            Categorias
          </NavLink>
          <NavLink to="/admin/equipment" onClick={() => setMenuOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect
                x="3"
                y="4"
                width="18"
                height="13"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M8 21h8m-4-4v4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            Equipamentos
          </NavLink>
          <p className="sidebar-label mt-8">MINHA CONTA</p>
          <NavLink to="/" onClick={() => setMenuOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle
                cx="12"
                cy="8"
                r="4"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M4 21v-2a8 8 0 0 1 16 0v2"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>
            Dados da conta
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <span aria-hidden="true">↻</span>
          <p>
            Cuidar hoje.
            <br />
            <strong>Renovar amanhã.</strong>
          </p>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-header">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="menu-toggle"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              aria-controls="admin-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <div>
              <p className="header-area">Manutenção técnica</p>
              <p className="header-breadcrumb">
                EcoTroca <span aria-hidden="true">/</span> {pageName}
              </p>
            </div>
          </div>
          <div className="header-account">
            <span className="user-avatar" aria-hidden="true">
              {initials}
            </span>
            <div className="header-user">
              <strong>{session?.user.name}</strong>
              <span>Administrador técnico</span>
            </div>
            <button type="button" className="secondary-button" onClick={logout}>
              Sair
            </button>
          </div>
        </header>
        <main id="admin-main" className="admin-main" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="admin-footer">
          EcoTroca <span>Conexões que renovam.</span>
        </footer>
      </div>
    </div>
  );
}
