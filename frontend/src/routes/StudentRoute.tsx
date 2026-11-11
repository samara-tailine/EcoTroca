import { Link, Outlet } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { Brand } from "../components/Brand";

export function StudentRoute() {
  const { session, logout } = useAuth();
  if (session?.user.accessProfiles.some(({ key }) => key === "STUDENT"))
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
        <h1>Esta área é do estudante.</h1>
        <p className="home-intro">
          Sua conta não possui o perfil necessário para acessar estas páginas.
        </p>
        <Link to="/" className="primary-button mt-6 w-fit px-6">
          Voltar para minha conta
        </Link>
      </main>
    </div>
  );
}
