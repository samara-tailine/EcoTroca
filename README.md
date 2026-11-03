# EcoTroca - ambiente de desenvolvimento

Estrutura inicial para iniciar o desenvolvimento, sem regras de negocio, autenticacao funcional ou modelos definitivos.

## Versoes das ferramentas

- Node.js 26.13.0 LTS; npm 11.20.0
- PostgreSQL 18.6; pgAdmin 4 9.18 (incluido no instalador EDB)
- Git 2.54.0; Visual Studio Code 1.144.1
- NestJS 12.3.2; Nest CLI 12.0.11 (dependencia local); TypeScript 6.0.3
- Prisma ORM 7.10.1; class-validator 0.15.1; class-transformer 0.5.1
- React 19.3.1; Vite 8.3.5; Tailwind CSS 4.3.4
- React Router 8.5.1; Axios 1.21.0
- ESLint 10.14.0; Prettier 3.9.10

As versoes exatas e dependencias completas estao nos arquivos package-lock.json do backend e frontend.

## Estrutura

- backend/: NestJS, TypeScript, Prisma, validacao e Swagger
- frontend/: React, TypeScript, Vite, Tailwind CSS, React Router e Axios
- docs/: decisoes de configuracao e pendencias
- .vscode/extensions.json: extensoes recomendadas para este workspace

## PostgreSQL

O servico local usa a porta 5432, o banco ecotroca_db e o papel restrito ecotroca_app. A senha da aplicacao, gerada aleatoriamente, fica somente em backend/.env, ignorado pelo Git. O arquivo backend/.env.example contem apenas valores de exemplo.

O PostgreSQL esta configurado para escutar somente em localhost.

Para conferir o servico:

    Get-Service postgresql-x64-18
    & 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h localhost -U ecotroca_app -d ecotroca_db

A conexao do Prisma usa DATABASE_URL no arquivo local .env. A senha administrativa do usuario postgres e independente da senha da aplicacao.

## Iniciar o backend

Em uma copia nova, crie backend/.env a partir de backend/.env.example e configure DATABASE_URL com as credenciais locais. Depois gere o cliente Prisma e inicie a API:

    cd C:\Projetos\EcoTroca\backend
    npm run db:generate
    npm run start:dev

- API: http://localhost:3000/api/health
- Swagger: http://localhost:3000/api/docs

## Autenticacao

- Cadastro publico: POST /api/auth/register. O usuario recebe somente o perfil STUDENT.
- Login: POST /api/auth/login. Envie o token retornado como Authorization: Bearer <token>.
- As demais rotas, incluindo health, exigem JWT. Gestao de usuarios e atribuicao de perfis exigem ADMIN.
- JWT_SECRET fica em backend/.env e deve ser substituido ao copiar o arquivo de exemplo.
- Swagger fica desativado por padrao; a UI estatica nao usa os guards da API.

O perfil ADMIN inicial precisa ser provisionado por um operador confiavel diretamente no banco. Contas antigas sem passwordHash precisam de uma configuracao de senha por procedimento administrativo; nao ha fluxo de recuperacao de senha nesta etapa.
## Iniciar o frontend

Em outro terminal:

    cd C:\Projetos\EcoTroca\frontend
    npm run dev

O Vite encaminha /api para http://localhost:3000. Para usar outro endereco, defina VITE_API_URL no arquivo local frontend/.env.

## Comandos uteis

Em backend/:

    npm run build
    npm run lint
    npm test
    npm run test:e2e
    npm run db:generate
    npm run db:validate
    npm run db:studio

Em frontend/:

    npm run build
    npm run lint
    npm run format

O schema Prisma esta intencionalmente sem modelos. Nao execute migracoes nem db push ate a especificacao de dados ser aprovada.