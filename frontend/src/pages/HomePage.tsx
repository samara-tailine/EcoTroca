import { canUseXerox } from "../auth/xeroxPermission";
import { canUseLibrary } from "../auth/libraryPermission";
import { profileLabel } from "../auth/profileLabels";
import { Link } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { Brand } from "../components/Brand";

export function HomePage() {
  const { session, logout } = useAuth();
  if (!session) return null;
  const { user } = session;

  return (
    <div className="home-page">
      <header className="page-header home-header">
        <Brand />
        <button type="button" className="secondary-button" onClick={logout}>
          Sair <span aria-hidden="true">↗</span>
        </button>
      </header>
      <main className="home-content">
        <p className="eyebrow">SUA CONTA ECOTROCA</p>
        <h1>Olá, {user.name}.</h1>
        <p className="home-intro">
          É bom ter você por aqui. Um novo ciclo começa com as nossas escolhas.
        </p>
        <section className="account-card" aria-labelledby="account-title">
          <div className="account-card-header">
            <h2 id="account-title">Informações da conta</h2>
            <span className="connected-badge">
              <span className="small-dot" /> Conectado
            </span>
          </div>
          <dl className="account-details">
            <div>
              <dt>Nome</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>
                {user.accessProfiles.length === 1
                  ? "Perfil de acesso"
                  : "Perfis de acesso"}
              </dt>
              <dd className="profile-list">
                {user.accessProfiles.length > 0
                  ? user.accessProfiles.map((profile) => (
                      <span className="profile-badge" key={profile.key}>
                        {profileLabel(profile.key)}
                      </span>
                    ))
                  : "Nenhum perfil associado"}
              </dd>
            </div>
          </dl>
        </section>
        {user.accessProfiles.some(({ key }) => key === "ADMIN") && (
          <Link
            to="/admin/categories"
            className="primary-button mt-6 w-fit px-6"
          >
            Abrir manutenção
          </Link>
        )}
        {user.accessProfiles.some(({ key }) => key === "STUDENT") && (
          <Link to="/student" className="primary-button mt-6 w-fit px-6">
            Abrir meu painel
          </Link>
        )}
        {canUseLibrary(user.accessProfiles.map(({ key }) => key)) && (
          <Link
            to="/library/disposals"
            className="primary-button mt-6 w-fit px-6"
          >
            Abrir painel da Biblioteca
          </Link>
        )}
        {canUseXerox(user.accessProfiles.map(({ key }) => key)) && (
          <Link to="/xerox/payments" className="primary-button mt-6 w-fit px-6">
            Abrir painel da Xerox
          </Link>
        )}
        <p className="home-note">Pequenas trocas. Novos começos.</p>
      </main>
      <footer className="page-footer">
        <span>EcoTroca</span>
        <span>Conexões que renovam.</span>
      </footer>
    </div>
  );
}
