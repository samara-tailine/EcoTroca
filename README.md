# EcoTroca

Projeto acadêmico de incentivo ao descarte responsável de equipamentos eletrônicos. Estudantes solicitam descartes, a Biblioteca recebe e confere os itens e a aprovação gera EcoCoins. O estudante pode enviar EcoCoins à Xerox, que consulta pagamentos e comprovantes. Não há integração bancária ou movimentação de reais.

## Tecnologias e arquitetura

- Backend: NestJS, TypeScript, Passport/JWT, Argon2id, Prisma ORM 7 e PostgreSQL.
- Frontend: React, TypeScript, Vite, React Router, Axios e Tailwind CSS; interface responsiva em português brasileiro.
- Autenticação Google opcional: Google Identity Services/OpenID Connect; emissão do JWT normal do EcoTroca.
- API REST sob /api; módulos users, categories, equipment, disposals, ecocoins, settings e auth. Regras nos services; guards globais; transações e restrições SQL protegem os históricos.
- Fontes em backend/src e frontend/src; schema e migrações em backend/prisma; documentos em docs. O Prisma Client é gerado localmente e não integra a entrega.

## Perfis e funcionalidades implementadas

| Perfil interno | Nome e responsabilidades |
| --- | --- |
| STUDENT | Estudante: cadastro público, solicitações com vários equipamentos, acompanhamento, carteira, histórico, pagamento próprio à Xerox e comprovantes. |
| LIBRARY | Administrador da Biblioteca: fila com filtros/paginação, recebimento, conferência completa, divergências, aprovação/rejeição e consulta de créditos relacionados ao processamento. |
| XEROX | Administrador da Xerox: consulta dos próprios pagamentos recebidos e comprovantes, incluindo resgates legados; não inicia débitos nem possui carteira acumulada. |
| ADMIN | Administrador técnico: cadastro/consulta/edição/ativação de usuários, atribuição de perfis e gestão de categorias/equipamentos. Não herda operações da Biblioteca ou Xerox. |

ADMIN não pode acumular LIBRARY/XEROX; LIBRARY e XEROX também não podem coexistir. STUDENT pode combinar com um desses perfis, mas pagamentos exigem STUDENT sem perfis administrativos. Para a apresentação, use contas separadas. As permissões são conferidas no backend a cada requisição e a sessão do frontend é atualizada após mudanças de acesso.

O cadastro por senha ou Google cria exclusivamente STUDENT. Senhas possuem 12 a 128 caracteres e somente hashes Argon2id são armazenados. A sessão JWT expira em uma hora. Há login, logout, vínculo Google autenticado e proteção das rotas. Não há recuperação de senha pública, refresh token, upload de fotos, estornos ou ajustes financeiros manuais.

### Regras preservadas

- Todos os pesos são fixos após criação, inclusive Mouse (120 g); API e PostgreSQL bloqueiam alterações.
- Fluxo: Pendente → Recebida → Em análise → Aprovada. Rejeição exige justificativa e pode ocorrer antes do recebimento. Ninguém aprova a própria solicitação.
- Cada item exige quantidade conferida, mesmo sem divergência. Peso aprovado = soma de quantityObserved × peso unitário histórico. Declarações originais e snapshots permanecem para auditoria; aprovações antigas não são recalculadas.
- Crédito automático: 10 EcoCoins/kg, aprovação e crédito na mesma transação, sem duplicidade.
- Pagamentos são iniciados exclusivamente pelo estudante autenticado, com confirmação e chave UUID de idempotência preservada nos reenvios. Saldo não pode ficar negativo.
- 1 EcoCoin = R$ 0,10. Moedas têm duas casas decimais; equivalente em reais pode ter três: 0,01 EcoCoin = R$ 0,001. É referência interna, sem arredondamento ou Pix bancário.

## Instalação em outro computador Windows

### 1. Pré-requisitos

Instale Node.js e npm, PostgreSQL com ferramentas de linha de comando e um navegador atualizado. Git é opcional para executar o ZIP. Ambiente validado nesta entrega: Node.js 26.13.0, npm 11.20.0 e PostgreSQL 18; as versões das bibliotecas estão nos package-lock.json. Não use Node.js 18 para este conjunto de dependências. Não é necessário Nest CLI global, pgAdmin é opcional.

Extraia o ZIP para uma pasta de sua escolha; os exemplos usam C:\EcoTroca. Abra PowerShell e confirme:

~~~powershell
node --version
npm.cmd --version
Set-Location C:\EcoTroca
~~~

Use npm.cmd/npx.cmd no PowerShell quando a política de execução bloquear scripts .ps1. Não é necessário desativar essa política.

### 2. Criar banco e usuário locais

Inicie o serviço PostgreSQL instalado. Em uma sessão administrativa do psql (ajuste a versão/caminho se necessário):

~~~powershell
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h localhost -U postgres -d postgres
~~~

Execute no psql, somente em uma instalação nova:

~~~sql
CREATE ROLE ecotroca_app LOGIN;
\password ecotroca_app
CREATE DATABASE ecotroca_db OWNER ecotroca_app ENCODING 'UTF8' TEMPLATE template0;
\q
~~~

O comando de senha solicita o valor sem colocá-lo no SQL. Guarde-o de forma segura. O papel da aplicação não precisa de SUPERUSER nem CREATEDB; como proprietário do banco, deve poder aplicar as migrações no schema public. Não recrie um banco existente. Use PostgreSQL somente em localhost para esta execução acadêmica local.

### 3. Instalar dependências e configurar ambiente

~~~powershell
Set-Location C:\EcoTroca\backend
npm.cmd ci
Copy-Item .env.example .env
notepad .env
~~~

Configure DATABASE_URL com o usuário/senha locais. Caracteres especiais da senha devem ser codificados para URL. Gere um segredo JWT aleatório no terminal e copie-o para JWT_SECRET; não o publique:

~~~powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))"
~~~

| Variável do backend | Uso |
| --- | --- |
| DATABASE_URL | Conexão PostgreSQL; nunca enviar ao frontend. |
| JWT_SECRET | Segredo aleatório de pelo menos 32 caracteres, diferente por instalação. |
| PORT | Porta da API; padrão 3000. |
| FRONTEND_ORIGIN | Origem exata permitida no CORS; local: http://localhost:5173. |
| NODE_ENV | development para execução local HTTP; production exige HTTPS para cookies Google. |
| SWAGGER_ENABLED | false por padrão; true habilita /api/docs. |
| ALLOWED_EMAIL_DOMAINS | Domínios exatos separados por vírgula: alunos.ifsuldeminas.edu.br,ifsuldeminas.edu.br. |
| ALLOW_LOCAL_TEST_EMAILS | false por padrão; libera apenas ecotroca.test quando development e banco/frontend locais. Ignorado em produção. |
| ADMIN_EMAIL | E-mail institucional do administrador para provisionamento e redefinição local. |
| GOOGLE_CLIENT_ID | Opcional; vazio desabilita Google sem impedir login por senha. |

~~~powershell
Set-Location C:\EcoTroca\frontend
npm.cmd ci
Copy-Item .env.example .env
~~~

VITE_API_URL=/api usa o proxy de desenvolvimento do Vite para localhost:3000. VITE_LOGO_URL é opcional e afeta apenas a imagem do login. Não coloque segredos em variáveis VITE_: elas são públicas e incorporadas ao build. Reinicie os processos após alterar ambientes; alterações VITE_ exigem novo build.

### 4. Preparar Prisma, banco e catálogo

~~~powershell
Set-Location C:\EcoTroca\backend
npx.cmd prisma validate --config prisma7.config.ts
npx.cmd prisma generate --config prisma7.config.ts
npx.cmd prisma migrate deploy --config prisma7.config.ts
npm.cmd run build
node scripts/seed-equipment.mjs
npx.cmd prisma migrate status --config prisma7.config.ts
~~~

Use migrate deploy e mantenha todas as migrações SQL: elas contêm triggers essenciais que não estão expressos apenas no schema. Não use db push, migrate reset ou exclusão do banco para instalar/atualizar. São 12 migrações nesta entrega.

A carga é idempotente, cria oito equipamentos oficiais e categorias e não recalcula históricos. Pesos existentes incompatíveis/nomes ambíguos interrompem a transação. Mouse não faz parte da carga: um Mouse já existente é preservado; em banco novo, ADMIN pode cadastrá-lo pela interface com 120 g. Após criação, seu peso também é imutável.

### 5. Iniciar a API e provisionar ADMIN

No primeiro terminal:

~~~powershell
Set-Location C:\EcoTroca\backend
npm.cmd run start:dev
~~~

A inicialização da API cria/atualiza as definições dos quatro perfis. Aguarde a API iniciar antes do provisionamento. Em outro terminal:

~~~powershell
Invoke-RestMethod http://localhost:3000/api/health
Set-Location C:\EcoTroca\backend
node scripts/provision-admin.mjs
~~~

A saúde é pública e retorna {"status":"ok"}. O script cria o e-mail institucional definido em ADMIN_EMAIL, perfil ADMIN e senha aleatória, exibida uma única vez no terminal. Guarde-a; não redirecione a saída a arquivos/logs. Se o e-mail já existir, interrompe sem alterar a conta ou redefinir senha. A execução deve ocorrer apenas uma vez por instalação nova.

Se precisar redefinir administrativamente a senha desse ADMIN existente:

~~~powershell
node scripts/reset-admin-password.mjs
~~~

Esse script exige entrada oculta no terminal, mínimo 12 caracteres e confirma o perfil ADMIN. Não há endpoint público de provisionamento.

### 6. Iniciar frontend e contas operacionais

Em outro terminal:

~~~powershell
Set-Location C:\EcoTroca\frontend
npm.cmd run dev
~~~

Abra http://localhost:5173. Entre como ADMIN e use Usuários para criar contas separadas LIBRARY e XEROX com senhas próprias. O cadastro público em /register cria estudantes. Nunca compartilhe a senha técnica como credencial operacional. Não desative nem remova o perfil do único ADMIN da instalação.

### 7. Builds e execução sem modo de desenvolvimento

~~~powershell
Set-Location C:\EcoTroca\backend
npm.cmd run build
npm.cmd run start:prod
~~~

~~~powershell
Set-Location C:\EcoTroca\frontend
npm.cmd run build
npm.cmd run preview -- --host localhost --port 5173
~~~

Pare o frontend de desenvolvimento antes de ocupar a mesma porta. Preview serve para conferência local, não substitui hospedagem de produção. Para produção, configure servidor estático com fallback das rotas para index.html, proxy /api para a API, HTTPS e FRONTEND_ORIGIN correto. Frontend e API devem preferencialmente compartilhar a origem; não basta copiar dist para qualquer servidor sem configurar /api. Para preview em outra porta, ajuste CORS e origem autorizada Google.

## Google opcional

Siga [docs/google-auth.md](docs/google-auth.md). Use um OAuth Client Web no Google Cloud, autorize a origem exata http://localhost:5173 e configure somente GOOGLE_CLIENT_ID em backend/.env. Não há Client Secret nem credencial secreta no frontend. Reinicie a API.

O GIS usa popup, ID token com nonce, validação de assinatura/emissor/audiência/expiração e identificação por sub. E-mail já cadastrado não é vinculado automaticamente: entre com senha e faça o vínculo em Dados da conta. Contas desativadas são recusadas.

Testing geralmente restringe acesso aos usuários de teste (até 100), mas há exceção para autenticação apenas com openid/email/profile. Este projeto não solicita acesso a outros serviços nem refresh token Google; a regra de sete dias de refresh tokens não determina a validade do JWT EcoTroca. Configuração de público, origens e políticas Workspace deve ser conferida no Console e testada com a conta da apresentação. Sem Google, o login por senha continua disponível.

## Roteiro de apresentação

1. STUDENT: cadastrar/entrar, solicitar dois equipamentos e acompanhar os dados declarados.
2. LIBRARY: receber, informar quantidade conferida em todos os itens (com ou sem divergência), aprovar com justificativa e consultar crédito.
3. STUDENT: verificar saldo/histórico; escolher Xerox, revisar valor/saldo restante, confirmar pagamento e abrir comprovante.
4. XEROX: consultar recebimento e comprovante, sem debitar terceiros.
5. ADMIN: mostrar usuários/perfis e catálogo; peso só é informado na criação. Demonstrar que perfis operacionais não acessam a área técnica.

Uma quantidade conferida zero é válida por item, mas o total aprovado deve ser positivo. Declarações originais e aprovações anteriores permanecem intactas. Reenvie pagamentos incertos com a mesma chave; não crie outra operação para repetir a mesma tentativa.

## Segurança, entrega e limitações

Não distribua .env, node_modules, dist, .git, dumps do banco, senhas, caches, logs ou configurações pessoais. Entregue fontes, public, package-lock.json, schema, todas as migrações, scripts, exemplos e documentação. npm ci exige acesso ao registro npm; Google exige internet e configuração externa. Binários nativos como Argon2 são instalados na máquina de destino.

Não há alteração forçada de dependências nesta preparação. Alertas conhecidos, resultados do ensaio limpo e conteúdo do ZIP estão em [docs/entrega-final.md](docs/entrega-final.md). A entrega acadêmica local não constitui certificação para exposição pública em produção. Limitação de tentativas de login, recuperação de senha e proteção do último ADMIN não estão implementadas.

## Documentação complementar

- [Perfis e catálogo](docs/access-control.md)
- [Descartes e conferência](docs/disposals.md)
- [Carteiras e créditos](docs/ecocoins.md)
- [Pagamentos iniciados pelo estudante](docs/student-payments.md)
- [Resgates históricos desativados](docs/redemptions.md)
- [Google](docs/google-auth.md)
- [Decisões técnicas](docs/technical-decisions.md)

## Acesso institucional obrigatório

Todos os cadastros, login por senha, Google, vínculo Google, cadastro administrativo e alteração de e-mail exigem domínio exato autorizado. A lista vem de ALLOWED_EMAIL_DOMAINS no backend (padrão: alunos.ifsuldeminas.edu.br,ifsuldeminas.edu.br), sem diferença entre maiúsculas/minúsculas. Subdomínios adicionais, sufixos parecidos e endereços pessoais são recusados. Mensagem: "O EcoTroca é de uso exclusivo da comunidade do IFSULDEMINAS. Utilize seu e-mail institucional."

Antes de provisionar ADMIN, configure ADMIN_EMAIL com um endereço institucional válido sob seu controle e recompile o backend. O script não altera contas existentes. Não existe senha padrão e não há migração de e-mails automática. Se a instalação anterior só tem ADMIN externo, ele permanece preservado mas sem acesso: provisione um novo ADMIN institucional com e-mail ainda não cadastrado, seguindo os comandos já documentados. Não é possível usar o provisionamento para promover silenciosamente uma conta existente.

Contas externas existentes, inclusive sessões JWT ainda válidas, perdem acesso: a estratégia JWT consulta o e-mail atual do banco em toda requisição protegida. Reinicie a API após atualizar esta versão ou alterar a política. Nome, perfis, carteira e históricos não são apagados. Não há exceção por perfil, nem para ADMIN.

Para demonstração exclusivamente local, configure explicitamente NODE_ENV=development, ALLOW_LOCAL_TEST_EMAILS=true, DATABASE_URL em localhost/127.0.0.1/::1 e FRONTEND_ORIGIN também local. Só então ecotroca.test é aceito. Produção sempre recusa esse domínio, mesmo que a flag esteja true ou que alguém o inclua em ALLOWED_EMAIL_DOMAINS. Nunca configure a exceção em uma instalação exposta na rede. O exemplo permanece false; não foi habilitada a exceção no ambiente original automaticamente.

O frontend consulta a política pública efetiva em GET /api/auth/google/config?emailPolicyOnly=true, mesmo sem Google habilitado; esse modo não cria ou troca o nonce/cookie Google. Não há cópia da lista em VITE_. A validação cliente é complementar; a API decide. No Google, tanto o e-mail verificado do token quanto o e-mail da conta já vinculada devem ser autorizados; sub permanece o identificador de vínculo e e-mails não são atualizados automaticamente.

Quando a exceção local está efetivamente ativa, a API inicia vinculada a 127.0.0.1, impedindo acesso direto pela rede. Use localhost/127.0.0.1 nos clientes locais.
