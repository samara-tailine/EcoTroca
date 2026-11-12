import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { Brand } from "../components/Brand";

export function XeroxLayout() {
  const { session, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const pageName = "Pagamentos recebidos";
  const name = session?.user.name ?? "";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <div className="admin-shell xerox-shell">
      <a className="skip-link" href="#xerox-main">
        Ir para o conteúdo
      </a>
      <aside className={`admin-sidebar ${menuOpen ? "open" : ""}`}>
        <Link
          to="/xerox/payments"
          className="sidebar-brand"
          aria-label="EcoTroca — Xerox"
          onClick={() => setMenuOpen(false)}
        >
          <Brand />
        </Link>
        <nav id="xerox-navigation" aria-label="Menu da Xerox">
          <p className="sidebar-label">XEROX</p>
          <NavLink to="/xerox/payments" onClick={() => setMenuOpen(false)}>
            <span className="nav-symbol" aria-hidden="true">
              ↻
            </span>
            Pagamentos recebidos
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
            Pequenas trocas.
            <br />
            <strong>Recebimentos com transpar?ncia.</strong>
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
              aria-controls="xerox-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ☰
            </button>
            <div>
              <p className="header-area">Área da Xerox</p>
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
              <span>Administrador da Xerox</span>
            </div>
            <button className="secondary-button" type="button" onClick={logout}>
              Sair
            </button>
          </div>
        </header>
        <main id="xerox-main" className="admin-main" tabIndex={-1}>
          <Outlet key={session?.user.id} />
        </main>
        <footer className="admin-footer">
          EcoTroca<span>EcoCoins que viram novas possibilidades.</span>
        </footer>
      </div>
    </div>
  );
}
