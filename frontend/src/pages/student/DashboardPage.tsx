import { canPay } from "../../auth/paymentPermission";
import { Link } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { studentApi } from "../../services/student";
import { useRemoteData } from "../../hooks/useRemoteData";
import {
  DisposalTable,
  StudentError,
  StudentLoading,
} from "../../components/student/StudentUI";
import {
  equivalentBrl,
  formatBrl,
  formatCoins,
} from "../../utils/studentFormat";

export function DashboardPage() {
  const { session } = useAuth();
  const remote = useRemoteData(studentApi.dashboard);
  const firstName = session?.user.name.trim().split(/\s+/)[0] ?? "estudante";
  return (
    <div className="space-y-6">
      <div className="catalog-title-row">
        <div>
          <p className="eyebrow">UM NOVO CICLO COMEÇA COM VOCÊ</p>
          <h1>Olá, {firstName}.</h1>
          <p>Acompanhe seus descartes e o valor das suas escolhas.</p>
        </div>
        {canPay(session?.user.accessProfiles.map((p) => p.key) ?? []) && (
          <Link to="/student/payments/new" className="primary-button">
            Enviar EcoCoin
          </Link>
        )}
      </div>
      {remote.loading && <StudentLoading />}
      {remote.error && (
        <StudentError message={remote.error} retry={remote.reload} />
      )}
      {remote.data && (
        <>
          <div className="student-metrics">
            <section className="student-metric metric-balance">
              <span className="metric-icon" aria-hidden="true">
                ◉
              </span>
              <p>Seu saldo de EcoCoins</p>
              <strong>
                {formatCoins(remote.data.wallet.balance)}{" "}
                <small>EcoCoins</small>
              </strong>
              <Link to="/student/ecocoins">Ver movimentações →</Link>
            </section>
            <section className="student-metric">
              <p>Equivalente em reais</p>
              <strong>
                {equivalentBrl(
                  remote.data.wallet.balance,
                  remote.data.wallet.coinValueBrl,
                )}
              </strong>
              <span>
                1 EcoCoin = {formatBrl(remote.data.wallet.coinValueBrl)}
              </span>
            </section>
            <section className="student-metric">
              <p>Descartes enviados</p>
              <strong>
                {remote.data.latest.total.toLocaleString("pt-BR")}
              </strong>
              <span>
                {remote.data.approved.toLocaleString("pt-BR")} solicitação(ões)
                aprovada(s)
              </span>
            </section>
            <section className="student-metric">
              <p>Em acompanhamento</p>
              <strong>
                {(
                  remote.data.pending +
                  remote.data.received +
                  remote.data.inReview
                ).toLocaleString("pt-BR")}
              </strong>
              <span>
                {remote.data.pending} pendente(s) · {remote.data.received}{" "}
                recebida(s) · {remote.data.inReview} em análise
              </span>
            </section>
          </div>
          <section className="student-guide">
            <div>
              <span className="eyebrow">
                DO DESCARTE A UMA NOVA POSSIBILIDADE
              </span>
              <h2>Seu próximo passo faz a diferença.</h2>
              <p>
                Escolha os equipamentos, conte como estão e envie sua
                solicitação. A Biblioteca fará o recebimento e a conferência.
              </p>
            </div>
            <Link to="/student/disposals/new" className="secondary-button">
              Solicitar descarte →
            </Link>
          </section>
          <section className="catalog-card">
            <div className="student-section-heading">
              <h2>Últimas solicitações</h2>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="text-action"
                  onClick={remote.reload}
                >
                  Atualizar
                </button>
                <Link className="text-action" to="/student/disposals">
                  Ver todas →
                </Link>
              </div>
            </div>
            {remote.data.latest.data.length ? (
              <DisposalTable items={remote.data.latest.data} />
            ) : (
              <div className="catalog-empty flex-col">
                <p>Você ainda não enviou uma solicitação.</p>
                <Link className="text-action" to="/student/disposals/new">
                  Criar minha primeira solicitação →
                </Link>
              </div>
            )}
          </section>
          <p className="catalog-help">
            O equivalente em reais é exato, inclusive frações de centavo. Envie
            valores positivos com até duas casas decimais em EcoCoins. Os
            créditos entram somente após a aprovação da Biblioteca.
          </p>
        </>
      )}
    </div>
  );
}
