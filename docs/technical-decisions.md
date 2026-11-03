# Decisoes e pendencias tecnicas

- O projeto usa Node.js 26 LTS, compativel com as versoes instaladas de NestJS, Vite e Prisma.
- Prisma ORM 7 usa o adaptador PostgreSQL @prisma/adapter-pg. Prisma ORM 8 ficou de fora porque a documentacao consultada o identificava como release candidate.
- O template Vite selecionou TypeScript 7, mas typescript-eslint estavel ainda nao declara suporte a TypeScript 7. O frontend foi alinhado ao TypeScript 6 para evitar dependencias incompativeis.
- O instalador PostgreSQL EDB tambem instala pgAdmin 4. Extensoes de React, Prisma, ESLint e Prettier estao recomendadas em .vscode/extensions.json; nenhuma foi instalada globalmente.
- O npm bloqueou scripts de instalacao nao aprovados. Foram liberados somente prisma e @prisma/engines; o script de telemetria @scarf/scarf permaneceu bloqueado.
- Nao ha modelos Prisma nem tabelas de negocio. O unico endpoint criado e /api/health.
- O PostgreSQL foi configurado para escutar somente em localhost. A aplicacao usa o papel restrito ecotroca_app, sem superuser, CREATEDB ou CREATEROLE.
- O instalador unattended usa uma credencial administrativa padrao documentada pelo EDB. Revise e altere essa credencial antes de permitir acesso alem da maquina local.
- npm reportou vulnerabilidades em dependencias transitivas: 18 no backend e 13 no frontend durante a instalacao. Nao foi executado npm audit fix, pois pode atualizar dependencias fora das faixas instaladas. Revise os relatorios com npm audit em cada projeto.

## Pendencias para a proxima etapa

- Revisar a credencial administrativa local do PostgreSQL no pgAdmin.
- Definir modelos, migracoes e modulos de negocio em etapa propria.
- Instalar as extensoes recomendadas no VS Code, se desejado; o workspace apenas lista as recomendacoes.