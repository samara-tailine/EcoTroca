# Decisões técnicas e limites da entrega

- Ambiente de validação: Windows, Node.js 26.13.0, npm 11.20.0 e PostgreSQL 18. Versões exatas das dependências nos lockfiles; instalação com npm.cmd ci, sem atualização forçada.
- Backend NestJS/TypeScript ESM, Prisma 7 com @prisma/adapter-pg e cliente gerado em src/generated/prisma. Configuração explícita: prisma7.config.ts.
- PostgreSQL UTF8; transações, bloqueios de linha/consultivos, índices únicos, checks e triggers asseguram pesos fixos, perfis separados, crédito único, pagamentos idempotentes e históricos imutáveis. Todas as migrações SQL fazem parte da instalação.
- Frontend React/Vite/Tailwind, identidade azul/verde e textos pt-BR. JWT compartilhado entre painéis; permissões reais vêm da API, sem escolha pública de perfil.
- Carteiras Decimal(14,2), crédito de 10 EcoCoins/kg conferido e equivalente de R$ 0,10 por EcoCoin. Pagamento Decimal(15,3) no equivalente, sem perda de fração de centavo. Não é Pix bancário.
- Fotos são URLs opcionais; não há upload, estorno, ajuste manual, recuperação de senha ou carteira da Xerox.
- Google é opcional, sem Client Secret/refresh token; identificação por sub e vínculo explícito autenticado. Dependência de internet, origens e público do Google Cloud documentada em google-auth.md.
- Swagger desabilitado por padrão. Saúde pública. Não há telemetria externa configurada como requisito da entrega.
- Sem limitação de tentativas de login ou proteção do último ADMIN. Para exposição pública, revisar segurança, HTTPS, políticas e dependências antes do deploy.
- Revisar vulnerabilidade transitiva effect na cadeia de ferramentas Prisma; não fazer downgrade automático sugerido pelo npm audit. Resultados da preparação em entrega-final.md.

O ZIP não inclui credenciais, banco, dumps, dependências ou artefatos compilados. Outro computador precisa criar seu próprio banco/ambiente, gerar Prisma, aplicar migrações, compilar e provisionar ADMIN conforme README.

## Restrição institucional (26/11/2026)

Acesso exige domínio exato configurado em ALLOWED_EMAIL_DOMAINS; padrões: alunos.ifsuldeminas.edu.br e ifsuldeminas.edu.br. A validação cobre cadastro/login tradicional, Google/vínculo, cadastro técnico, atualização de e-mail e todas as sessões protegidas. Conta externa anterior não é apagada, mas o JWT é recusado. Nenhum perfil contorna a política. No Google, tanto identidade verificada quanto conta persistida devem ser permitidas; não se confia em domínio declarado pelo navegador ou apenas no claim hd.

ALLOW_LOCAL_TEST_EMAILS=false por padrão. ecotroca.test só funciona mediante true em NODE_ENV=development, com banco e frontend loopback; nunca em produção, mesmo inserido na lista comum. A política efetiva é publicada no endpoint Google de configuração (emailPolicyOnly=true não modifica nonce), para feedback dos formulários sem duplicar configuração. ADMIN_EMAIL define o endereço institucional dos scripts locais. Consulte o README para instalação e provisionamento, sem alteração automática de contas ou históricos.
