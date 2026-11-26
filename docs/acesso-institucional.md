# Acesso institucional obrigatório

Domínios padrão: alunos.ifsuldeminas.edu.br e ifsuldeminas.edu.br. A comparação é exata, sem distinção de caixa, após remover espaços externos. Não há wildcard, aceitação automática de subdomínio ou verificação por substring. Formato de e-mail também é validado. A mensagem é: "O EcoTroca é de uso exclusivo da comunidade do IFSULDEMINAS. Utilize seu e-mail institucional."

## Configuração exclusiva do backend

~~~dotenv
ALLOWED_EMAIL_DOMAINS=alunos.ifsuldeminas.edu.br,ifsuldeminas.edu.br
ALLOW_LOCAL_TEST_EMAILS=false
ADMIN_EMAIL=administrador@ifsuldeminas.edu.br
~~~

ADMIN_EMAIL é um exemplo: substitua pelo endereço institucional do responsável, sem incluir senha. Compile, inicie a API para inicializar perfis e execute node scripts/provision-admin.mjs. O script gera senha aleatória e mostra uma única vez, armazena Argon2id e não altera uma conta existente. reset-admin-password.mjs também usa ADMIN_EMAIL, valida domínio/perfil e exige senha oculta. Nenhum endereço real foi inventado/provisionado nesta preparação.

A lista é configurável, separada por vírgula; valores inválidos são recusados e lista vazia não libera acesso. ecotroca.test é retirado da lista comum e nunca é autorizado em produção, mesmo se estiver nela.

Exceção local exige todas as condições: NODE_ENV=development, ALLOW_LOCAL_TEST_EMAILS=true, host de DATABASE_URL loopback (localhost/127.0.0.1/::1) e FRONTEND_ORIGIN loopback (padrão http://localhost:5173). Ausência da flag ou outro ambiente mantém o bloqueio. Não exponha essa configuração de demonstração na rede. O .env real original não foi alterado nem a exceção habilitada automaticamente. Quando a exceção está ativa, main.ts vincula a API somente a 127.0.0.1; esse binding foi verificado em execução.

## Cobertura

- Cadastro público e administrativo; edição de e-mail no service de usuários.
- Login por senha e criação de qualquer nova sessão JWT.
- Identidade Google validada criptograficamente e e-mail persistido da conta vinculada. O identificador continua sub. Não se confia no claim hd como autorização nem no e-mail decodificado pelo navegador.
- Vínculo Google exige domínio autorizado tanto na identidade quanto na conta, além da senha, JWT e nonce já existentes.
- JWTStrategy consulta e-mail/atividade/perfis atuais em toda chamada protegida. Um JWT antigo, mesmo assinado e não expirado, não dá acesso a conta externa; e-mail do payload não substitui o banco.
- Frontend consulta a política pública da API para feedback em login, cadastro e gestão de usuários; credencial Google é decodificada apenas para antecipar feedback. Backend continua obrigatório e independente desse cliente.

GET /api/auth/google/config?emailPolicyOnly=true publica somente a política e não gera ou substitui cookies/nonce. A configuração funciona com Google desabilitado e não requer novas rotas nem variáveis VITE_. A resposta permanece no-store.

## Preservação e ativação

Não há migração nova nem alteração automática de contas, perfis, saldos, descartes, vínculos ou movimentações. Contas externas continuam armazenadas, mas deixam de autenticar. Reinicie a API com a nova versão e a configuração escolhida; servidores antigos ainda em execução precisam ser atualizados.

Na consulta de leitura do ambiente original, foram encontradas quatro contas ecotroca.test e três gmail.com, nenhuma institucional. Sem a exceção local, todas serão bloqueadas pela regra solicitada. Para uso institucional, provisione novo ADMIN com e-mail institucional ainda não cadastrado, seguindo o README. Para apresentação local com as contas existentes ecotroca.test, habilite explicitamente a exceção local; gmail.com continua bloqueado. Nenhuma conta foi alterada ou excluída.

## Verificações desta entrega

125 asserções institucionais: domínio exato, caixa, fraude/sufixo/subdomínio, pessoais, cadastro/login/admin/edição, sessões antigas inclusive claim de e-mail forjado, domínio de demonstração local e bloqueio em produção, Google RSA com certificado temporário, audiência/nonce, hd forjado, conta Google vinculada com e-mail externo, vínculo permitido/recusado e consistência da validação de frontend.

170 asserções adicionais de regressão: quatro perfis, pesos fixos, descarte, conferência e crédito, histórico, pagamento simultâneo idempotente e permissões. Tudo em banco temporário separado. Google real ainda depende do Console/conta institucional; o certificado do teste foi simulado, sem substituir verificações no código entregue.

## Seed acadêmico local

Para banco vazio, NODE_ENV=development e ALLOW_LOCAL_TEST_EMAILS=true com banco/frontend locais: após npm.cmd ci, geração Prisma, migrate deploy e build, execute node scripts/seed-demo.mjs antes de iniciar a API. Cria somente perfis/contas/catálogo ausentes, sem sobrescrever existentes. Credenciais públicas fictícias e roteiro completo no README principal; nunca usar em produção. Não exige Google nem o banco original.
