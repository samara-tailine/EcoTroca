# Backend EcoTroca

API NestJS/Prisma/PostgreSQL, prefixo /api. Consulte o [README principal](../README.md) para instalação Windows completa, banco, ambientes, migrações, catálogo, ADMIN, execução e apresentação.

Ordem: npm.cmd ci → configurar .env → npx.cmd prisma generate --config prisma7.config.ts → npx.cmd prisma migrate deploy --config prisma7.config.ts → npm.cmd run build → node scripts/seed-equipment.mjs → npm.cmd run start:dev. Com a API inicializada (perfis criados), execute node scripts/provision-admin.mjs em outro terminal.

Saúde pública: GET /api/health. Swagger desabilitado por padrão; SWAGGER_ENABLED=true habilita /api/docs. Rotas de negócio exigem JWT e perfil autorizado.

Para execução compilada: npm.cmd run start:prod após build. Não execute os testes e2e contra um banco com dados reais: a inicialização da aplicação atualiza definições de perfis. Use ambiente de testes separado. Não execute migrate reset ou db push em instalações existentes.

Antes do provisionamento, configure ADMIN_EMAIL institucional e ALLOWED_EMAIL_DOMAINS. Acesso de ecotroca.test só é liberado explicitamente no ambiente local de desenvolvimento; padrão false, sem exceção em produção. Sessões externas antigas são recusadas pelo JWTStrategy. Não há nova migração de banco.
