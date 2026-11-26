# Demonstração acadêmica local

Siga o capítulo inicial do README. Não importe o banco original. Após configurar um banco vazio local em UTF8 e o .env com NODE_ENV=development e ALLOW_LOCAL_TEST_EMAILS=true, execute no backend:

~~~powershell
npm.cmd ci
npx.cmd prisma generate --config prisma7.config.ts
npx.cmd prisma migrate deploy --config prisma7.config.ts
npm.cmd run build
node scripts/seed-demo.mjs
npm.cmd run start:prod
~~~

No frontend: npm.cmd ci, configurar .env pelo exemplo e npm.cmd run dev. Abra http://localhost:5173. start:prod executa o backend compilado, mas o ambiente deste roteiro continua development.

As quatro contas e respectivas senhas públicas fictícias estão na tabela do README. O seed cria perfis/contas/catálogo faltantes, não exige API já iniciada e não sobrescreve dados existentes. Não é executado automaticamente. Carteira inicia zerada: solicitar descarte, conferir e aprovar na Biblioteca para gerar crédito e demonstrar pagamento à Xerox.

Produção, flag false/ausente e banco/frontend remotos bloqueiam o seed. E-mails institucionais continuam permitidos; Gmail e domínios fraudulentos permanecem bloqueados. Nunca reutilize as senhas públicas fora da demonstração local.

Validação desta entrega: quatro logins reais na API e no navegador; permissões isoladas; instalação vazia e idempotência; fluxo de descarte/crédito/pagamento. Consulte entrega-final.md para detalhes e limitações.
