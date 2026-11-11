import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { Brand } from "../components/Brand";

export function LibraryLayout() {
  const { session, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const pageName = pathname.endsWith("/credits")
    ? "Créditos de EcoCoins"
    : pathname === "/library/disposals"
      ? "Fila de descartes"
      : "Detalhes e conferência";
  const name = session?.user.name ?? "";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <div className="admin-shell library-shell">
      <a className="skip-link" href="#library-main">
        Ir para o conteúdo
      </a>
      <aside className={`admin-sidebar ${menuOpen ? "open" : ""}`}>
        <Link
          to="/library/disposals"
          className="sidebar-brand"
          aria-label="EcoTroca — Biblioteca"
          onClick={() => setMenuOpen(false)}
        >
          <Brand />
        </Link>
        <nav id="library-navigation" aria-label="Menu da Biblioteca">
          <p className="sidebar-label">BIBLIOTECA</p>
          <NavLink to="/library/disposals" onClick={() => setMenuOpen(false)}>
            <span className="nav-symbol" aria-hidden="true">
              ↻
            </span>
            Fila de descartes
          </NavLink>
          <NavLink to="/library/credits" onClick={() => setMenuOpen(false)}>
            <span className="nav-symbol" aria-hidden="true">
              ◉
            </span>
            Créditos de EcoCoins
          </NavLink>
          <p className="sidebar-label mt-8">MINHA CONTA</p>
          <NavLink to="/" onClick={() => setMenuOpen(false)}>
            <span className="nav-symbol" aria-hidden="true">
              ○
            </span>
            Dados da conta
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <span aria-hidden="true">↻</span>
          <p>
            Conferir com cuidado.
            <br />
            <strong>Renovar com responsabilidade.</strong>
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
              aria-controls="library-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ☰
            </button>
            <div>
              <p className="header-area">Área da Biblioteca</p>
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
              <strong>{name}</strong>
              <span>Administrador da Biblioteca</span>
            </div>
            <button className="secondary-button" type="button" onClick={logout}>
              Sair
            </button>
          </div>
        </header>
        <main id="library-main" className="admin-main" tabIndex={-1}>
          <Outlet key={session?.user.id} />
        </main>
        <footer className="admin-footer">
          EcoTroca<span>Receber, conferir e transformar.</span>
        </footer>
      </div>
    </div>
  );
}
