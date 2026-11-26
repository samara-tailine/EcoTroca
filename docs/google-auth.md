# Cadastro e autenticação Google

O cadastro por senha continua em /register, usando POST /api/auth/register com name, email e password.
A confirmação da senha é somente local. Cadastros públicos tradicionais e Google criam exclusivamente STUDENT.

## Configuração no Google Cloud

1. Crie ou selecione seu projeto no Google Cloud Console e abra Google Auth Platform.
2. Configure Branding, nome EcoTroca, e-mails de suporte e domínios reais. Configure Audience: interno apenas se a organização realmente exigir; externo para público geral. Durante testes, adicione as contas de teste quando solicitado pelo Console.
3. Em Clients, crie um cliente OAuth do tipo Web application.
4. Em Authorized JavaScript origins, adicione http://localhost e http://localhost:5173 para o Vite padrão. Se usar outra porta de desenvolvimento ou preview (por exemplo 4173), cadastre também essa origem exata. Em produção, cadastre a origem HTTPS real do frontend, incluindo porta se não padrão. Não coloque caminhos como /login ou /register nas origens.
5. Esta implementação usa GIS com popup e callback JavaScript; não há rota de callback OAuth por redirecionamento e não é necessário inventar uma Redirect URI.
6. Copie o Client ID real para GOOGLE_CLIENT_ID no backend/.env. A variável de exemplo está vazia propositalmente. Reinicie o backend.
7. Não é utilizado Client Secret, refresh token ou chave privada Google. O Client ID é público e é fornecido ao frontend pelo endpoint de configuração; JWT_SECRET e DATABASE_URL permanecem somente no backend.

Sem GOOGLE_CLIENT_ID, o login por senha continua funcionando e o frontend informa que Google ainda não está configurado.
O botão oficial é renderizado pelo SDK somente após existir um Client ID válido; não há botão imitado ou credencial fictícia.

Origens de desenvolvimento são HTTP somente em localhost. Produção exige HTTPS, NODE_ENV=production e FRONTEND_ORIGIN com a origem exata do frontend, sem wildcard.
Prefira frontend e /api sob a mesma origem, usando proxy reverso. O cookie de confirmação é HttpOnly, SameSite=Strict, válido por cinco minutos e Secure em produção.
Origens diferentes precisam continuar no mesmo site (por exemplo subdomínios HTTPS do mesmo domínio); domínios totalmente distintos exigem uma estratégia diferente de cookies, não implementada aqui.
O cliente envia withCredentials apenas nas chamadas Google. O CORS permite credenciais para a origem configurada.
Não exponha a API de desenvolvimento fora do ambiente local sem a configuração de produção.

Se o hosting define CSP, permita o script https://accounts.google.com/gsi/client e os frames/conexões Google necessários, conforme documentação oficial. Não hospede uma cópia do SDK.
Se o hosting define Cross-Origin-Opener-Policy e bloquear o popup, utilize same-origin-allow-popups conforme a orientação GIS.

## Endpoints

- GET /api/auth/google/config: público; retorna enabled e, quando habilitado, Client ID público e nonce. Define cookie de confirmação assinado e resposta no-store.
- POST /api/auth/google: público; corpo {credential}, contendo ID token recebido pelo callback oficial. Exige o cookie e o nonce correspondente no ID token. Emite o mesmo JWT do login por senha.
- GET /api/auth/google/status: exige JWT EcoTroca; retorna somente linked e canLink da própria conta.
- POST /api/auth/google/link: exige JWT EcoTroca e corpo {credential,password}. Exige cookie/nonce, senha atual válida e conta Google com o mesmo e-mail. Vincula somente a própria conta, sem alterar perfis.

A interface usa o botão oficial com text=continue_with e locale pt-BR em /login e /register.
Em Dados da conta (/), o usuário autenticado pode confirmar sua senha e usar o botão oficial para vincular o Google.
Não há seleção de perfil nem autorização para cadastrar administradores via Google.
Usuários Google já vinculados mantêm seus perfis existentes; nenhuma permissão adicional é concedida.
Uma conta criada somente pelo Google não recebe senha fictícia. Não foram adicionados recuperação de senha, desvinculação ou gerenciamento de múltiplos provedores.

## Validação e preservação de contas

google-auth-library verifica assinatura com as chaves públicas Google, emissor, audiência e validade.
O serviço também exige exp ainda válido, email_verified=true, e-mail válido, sub presente e nonce correspondente ao cookie assinado.
O identificador persistido é googleSubject (sub), único. Mudanças posteriores do e-mail Google não movem nem associam automaticamente contas.
No primeiro acesso, um e-mail já existente sem vínculo retorna conflito e orienta entrar com senha antes de vincular.
A senha é reconfirmada no vínculo, além do JWT. Conta inativa é recusada.
Tokens Google e senhas não são persistidos em logs ou no navegador; o JWT normal continua usando o gerenciamento de sessão existente.

A criação Google e a atribuição STUDENT são atômicas; uma trava por sub evita cadastros concorrentes duplicados.
O vínculo bloqueia a conta durante a reconfirmação da senha e utiliza índice único do sub.
A criação de carteira para STUDENT continua pelo mecanismo existente; descartes e EcoCoins não foram alterados.

## Migração e validação

Migração aditiva 20261122000000_google_identity: acrescenta User.googleSubject opcional VARCHAR(255), com índice único. Usuários anteriores permanecem com NULL; senhas e dados existentes não são reescritos.
Aplicação local: prisma migrate deploy --config prisma7.config.ts, dentro de backend.
Dependência acrescentada: google-auth-library. Execute npm.cmd ci após copiar os package-lock.json da entrega.

Verificações locais: assinatura RSA real com chaves temporárias e certificado simulado somente no teste; recusa de assinatura inválida, issuer/aud/exp/nonce inválidos, e-mail não verificado e ausência de sub; criação STUDENT, retorno pelo sub mesmo após mudança de e-mail, conta inativa, conflito sem vínculo automático, senha incorreta no vínculo, vínculo explícito, JWT normal e login por senha preservado.
Os cadastros de teste foram revertidos em transação, sem contas residuais.
Builds backend e frontend executados.
O teste de ponta a ponta com Google real depende do Client ID e das origens cadastradas pelo responsável no Console.

## Arquivos

Backend: package.json, package-lock.json, .env.example, prisma/schema.prisma, prisma/migrations/20261122000000_google_identity/migration.sql, src/main.ts, src/auth/auth.module.ts, src/auth/auth.service.ts, src/auth/google-auth.controller.ts, src/auth/google-auth.service.ts, src/auth/google-token.service.ts, src/auth/google-challenge.service.ts e src/auth/dto/google-auth.dto.ts.

Frontend: src/auth/AuthContext.ts, src/auth/AuthProvider.tsx, src/services/api.ts, src/services/google.ts, src/components/GoogleButton.tsx, src/components/GoogleAccountLink.tsx, src/pages/LoginPage.tsx, src/pages/RegisterPage.tsx, src/pages/HomePage.tsx e src/styles/mockup.css.

## Referências oficiais

- [Verificação do ID token e identificação por sub](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- [SDK e botão oficial GIS](https://developers.google.com/identity/gsi/web/reference/js-reference)
- [Client ID, origens e configuração do hosting](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)

## Testing e apresentação acadêmica

Testing externo normalmente usa lista de até 100 usuários de teste; há exceção para autenticação restrita a openid/email/profile. O EcoTroca usa identidade básica, sem acesso a APIs de outros serviços ou refresh token Google. A expiração geral de sete dias de refresh tokens em Testing não altera o JWT EcoTroca de uma hora. Verifique o público efetivo e as políticas Workspace no Console; elas não podem ser confirmadas pelo arquivo .env. Teste a conta real que será usada na apresentação. Sem Google, use o login por senha.

Origens exatas (incluindo porta) devem corresponder ao navegador; localhost:5173 está documentado, mas o cadastro remoto precisa ser conferido pelo responsável. Use NODE_ENV=development para HTTP local e production somente com HTTPS. Nenhum Client Secret é solicitado.

Referências: [estados OAuth e exceção de identidade básica](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview), [expiração de refresh tokens](https://developers.google.com/identity/protocols/oauth2#expiration).

## Restrição institucional (26/11/2026)

Acesso exige domínio exato configurado em ALLOWED_EMAIL_DOMAINS; padrões: alunos.ifsuldeminas.edu.br e ifsuldeminas.edu.br. A validação cobre cadastro/login tradicional, Google/vínculo, cadastro técnico, atualização de e-mail e todas as sessões protegidas. Conta externa anterior não é apagada, mas o JWT é recusado. Nenhum perfil contorna a política. No Google, tanto identidade verificada quanto conta persistida devem ser permitidas; não se confia em domínio declarado pelo navegador ou apenas no claim hd.

ALLOW_LOCAL_TEST_EMAILS=false por padrão. ecotroca.test só funciona mediante true em NODE_ENV=development, com banco e frontend loopback; nunca em produção, mesmo inserido na lista comum. A política efetiva é publicada no endpoint Google de configuração (emailPolicyOnly=true não modifica nonce), para feedback dos formulários sem duplicar configuração. ADMIN_EMAIL define o endereço institucional dos scripts locais. Consulte o README para instalação e provisionamento, sem alteração automática de contas ou históricos.
