import { Link, Outlet } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { canUseXerox } from "../auth/xeroxPermission";
import { Brand } from "../components/Brand";

export function XeroxRoute() {
  const { session, logout } = useAuth();
  if (session && canUseXerox(session.user.accessProfiles.map(({ key }) => key)))
    return <Outlet />;
  return (
    <div className="home-page">
      <header className="page-header">
        <Brand />
        <button type="button" className="secondary-button" onClick={logout}>
          Sair
        </button>
      </header>
      <main className="home-content">
        <p className="eyebrow">ACESSO RESTRITO</p>
        <h1>Esta área é exclusiva da Xerox.</h1>
        <p className="home-intro">
          É necessário o perfil Administrador da Xerox, sem os perfis técnico ou
          da Biblioteca, conforme as permissões do sistema.
        </p>
        <Link to="/" className="primary-button mt-6 w-fit px-6">
          Voltar para minha conta
        </Link>
      </main>
    </div>
  );
}
