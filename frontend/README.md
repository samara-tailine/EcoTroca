# Frontend EcoTroca

React + TypeScript + Vite + Tailwind, responsivo e em pt-BR. Instalação e configuração completas no [README principal](../README.md).

~~~powershell
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run dev
~~~

Abra http://localhost:5173; mantenha a API em localhost:3000. VITE_API_URL=/api usa o proxy local. Google obtém o Client ID público da API: não configure Client Secret nem segredo JWT no frontend.

| Área | Rotas principais |
| --- | --- |
| Pública | /login, /register |
| Conta autenticada | / |
| Estudante | /student, /student/disposals, /student/disposals/new, /student/disposals/:id, /student/ecocoins, /student/payments/new, /student/payments/:id |
| Biblioteca | /library/disposals, /library/disposals/:id, /library/credits |
| Xerox | /xerox/payments, /xerox/payments/:id |
| Técnico | /admin/users, /admin/categories, /admin/equipment |

Os guards do frontend e a API protegem as áreas por perfil; JWT e logout são compartilhados. /xerox/redemptions apenas redireciona à consulta: não há formulário de débito. Solicitação de descarte permanece no menu do estudante; o botão principal é Enviar EcoCoin.

A conferência exige quantityObserved em todos os itens. O painel da Biblioteca separa declarado/conferido e calcula prévia a partir das quantidades conferidas, sem editar os snapshots. A aprovação/crédito é responsabilidade transacional da API.

O pagamento exige revisão e confirmação. A tentativa mantém dados e idempotencyKey em sessionStorage para reenvio idêntico após falha/recarga. Moedas têm duas casas; equivalente em reais pode ter três casas (0,01 EcoCoin = R$ 0,001), sem arredondamento bancário.

Build: npm.cmd run build. Conferência local: npm.cmd run preview -- --host localhost --port 5173 (pare o dev antes). Hosting real precisa de fallback SPA, HTTPS e proxy /api; veja o README principal. A identidade visual, as logos e os quatro painéis existentes são preservados.

Formulários consultam a política institucional efetiva da API em /auth/google/config?emailPolicyOnly=true e exibem a mensagem de uso exclusivo. Não configure domínios em VITE_: a API continua sendo a autoridade. Tokens Google são decodificados no cliente somente para feedback, nunca para autorizar; a assinatura e os claims são verificados no backend.
