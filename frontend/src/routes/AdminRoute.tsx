import { Link, Outlet } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { Brand } from "../components/Brand";

export function AdminRoute() {
  const { session, logout } = useAuth();
  if (session?.user.accessProfiles.some(({ key }) => key === "ADMIN"))
    return <Outlet />;

  return (
    <div className="home-page">
      <header className="page-header">
        <Brand />
        <button className="secondary-button" onClick={logout}>
          Sair
        </button>
      </header>
      <main className="home-content">
        <p className="eyebrow">ACESSO RESTRITO</p>
        <h1>Esta área é de manutenção técnica.</h1>
        <p className="home-intro">
          Seu perfil não possui permissão para acessar estas páginas.
        </p>
        <Link className="primary-button mt-6 w-fit px-6" to="/">
          Voltar para minha conta
        </Link>
      </main>
    </div>
  );
}
