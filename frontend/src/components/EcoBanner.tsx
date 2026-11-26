import { Icon } from "./Icon";
export function EcoBanner() {
  return (
    <section
      className="eco-banner"
      aria-label="EcoTroca: sustentabilidade em cada troca"
    >
      <div className="eco-banner-copy">
        <span className="eco-banner-kicker">
          CONECTANDO ATITUDES, RENOVANDO O FUTURO
        </span>
        <h2>EcoTroca</h2>
      </div>
      <div className="eco-banner-art" aria-hidden="true">
        <Icon name="leaf" />
        <span />
        <span />
      </div>
    </section>
  );
}
