import { canPay } from "../auth/paymentPermission";
import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { Brand } from "../components/Brand";

export function StudentLayout() {
  const { session, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const pageName = pathname.startsWith("/student/payments")
    ? "Pagamentos de EcoCoins"
    : pathname.endsWith("/new")
      ? "Nova solicitação"
      : pathname === "/student/disposals"
        ? "Meus descartes"
        : pathname.startsWith("/student/disposals/")
          ? "Detalhes do descarte"
          : pathname.endsWith("/ecocoins")
            ? "Meus EcoCoins"
            : "Visão geral";
  const name = session?.user.name ?? "";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <div className="admin-shell student-shell">
      <a className="skip-link" href="#student-main">
        Ir para o conteúdo
      </a>
      <aside className={`admin-sidebar ${menuOpen ? "open" : ""}`}>
        <Link
          to="/student"
          className="sidebar-brand"
          aria-label="EcoTroca — área do estudante"
          onClick={() => setMenuOpen(false)}
        >
          <Brand />
        </Link>
        <nav id="student-navigation" aria-label="Menu do estudante">
          <p className="sidebar-label">MEU ECOTROCA</p>
          {canPay(session?.user.accessProfiles.map((p) => p.key) ?? []) && (
            <NavLink
              to="/student/payments/new"
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-symbol" aria-hidden="true">
                ↗
              </span>
              Enviar EcoCoin
            </NavLink>
          )}
          <NavLink to="/student" end onClick={() => setMenuOpen(false)}>
            <span className="nav-symbol" aria-hidden="true">
              ⌂
            </span>
            Visão geral
          </NavLink>
          <NavLink
            to="/student/disposals/new"
            onClick={() => setMenuOpen(false)}
          >
            <span className="nav-symbol" aria-hidden="true">
              ＋
            </span>
            Solicitar descarte
          </NavLink>
          <NavLink
            to="/student/disposals"
            end
            onClick={() => setMenuOpen(false)}
          >
            <span className="nav-symbol" aria-hidden="true">
              ↻
            </span>
            Meus descartes
          </NavLink>
          <NavLink to="/student/ecocoins" onClick={() => setMenuOpen(false)}>
            <span className="nav-symbol" aria-hidden="true">
              ◉
            </span>
            Meus EcoCoins
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
            Seu eletrônico pode ter
            <br />
            <strong>um novo começo.</strong>
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
              aria-controls="student-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ☰
            </button>
            <div>
              <p className="header-area">Área do estudante</p>
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
              <span>Estudante</span>
            </div>
            <button type="button" className="secondary-button" onClick={logout}>
              Sair
            </button>
          </div>
        </header>
        <main id="student-main" className="admin-main" tabIndex={-1}>
          <Outlet key={session?.user.id} />
        </main>
        <footer className="admin-footer">
          EcoTroca<span>Pequenas trocas. Novos começos.</span>
        </footer>
      </div>
    </div>
  );
}
