# Pagamentos de EcoCoins iniciados pelo estudante

O estudante escolhe uma conta Xerox ativa, revisa o valor e confirma o envio.
A Xerox consulta recebimentos e comprovantes; não inicia débitos e não possui carteira própria.
O sistema não movimenta reais nem integra com Pix bancário.

## API (prefixo /api)

- GET /ecocoins/payment-recipients: STUDENT sem ADMIN, LIBRARY ou XEROX. Retorna somente ID e nome das contas Xerox ativas e elegíveis.
- POST /ecocoins/payments: exclusivamente STUDENT sem perfis administrativos. Corpo: recipientId (UUID), amount (string decimal positiva com até duas casas), idempotencyKey (UUID). studentId é rejeitado; o JWT identifica o pagador.
- GET /ecocoins/payments?page=1&pageSize=10: exclusivamente XEROX sem ADMIN/LIBRARY. Lista somente recebimentos desta conta, incluindo resgates antigos registrados por ela.
- GET /ecocoins/payments/:id: comprovante restrito ao estudante pagador ou à Xerox destinatária, conforme os mesmos limites de perfil. Inclui comprovantes legados.
- POST /ecocoins/redemptions: removido, retorna 404 para usuários autenticados. O PostgreSQL também recusa novos débitos pelo formato antigo.
- GET /ecocoins/wallet e GET /ecocoins/movements: consultas existentes da própria carteira preservadas. Movimentações novas incluem origem STUDENT_PAYMENT e referência ao comprovante.

Uma chave identifica uma operação lógica. Reenvios com os mesmos dados retornam o comprovante original sem novo débito.
A reutilização com outro pagador, destinatário ou valor retorna conflito.
Recebimentos da Xerox não revelam saldo do estudante.

## Precisão e segurança

EcoCoins e saldos continuam Decimal(14,2). A conversão permanece 1 EcoCoin = R$ 0,10.
O equivalente do novo pagamento é Decimal(15,3), sem arredondamento:
0,01 EcoCoin = R$ 0,001; 1,25 EcoCoin = R$ 0,125.
A regra antiga de múltiplos de 0,10 não se aplica aos pagamentos novos.
Os valores em reais são apenas equivalentes internos, não transferências bancárias.

A transação obtém trava consultiva pela chave, trava as contas para conferir atividade/perfis e bloqueia a carteira.
Um decremento condicionado ao saldo e a criação do pagamento e débito ocorrem na mesma transação.
O banco exige o vínculo único com o débito e mantém ambos os históricos imutáveis.
Resgates anteriores, descartes, créditos, pesos e configurações não são reescritos.

## Migração

20261112000000_student_payments: cria EcoCoinPayment e o vínculo opcional e único EcoCoinMovement.paymentId.
Acrescenta validações de autorização, conversão e vínculo obrigatório ao fim da transação.
A função que validava resgates passa a exigir o formato de pagamento para novos débitos.
Aplicada com prisma migrate deploy --config prisma7.config.ts, sem recriar o banco.

## Interface

- /student/payments/new: seleção da Xerox, valor, equivalente exato, saldo restante estimado, revisão e confirmação explícita.
- /student/payments/:id: comprovante do próprio estudante.
- /student: botão principal Enviar EcoCoin; solicitar descarte permanece no menu.
- /student/ecocoins: saldo, créditos, pagamentos e resgates anteriores com acesso aos comprovantes.
- /xerox/payments: recebimentos paginados desta conta Xerox.
- /xerox/payments/:id: comprovante recebido.
- /xerox/redemptions: redireciona para recebimentos, sem formulário de débito.

A operação em tentativa fica no sessionStorage, separada por estudante. A mesma chave e os mesmos dados são recuperados após recarga ou falha.
Não se inicia outra operação enquanto o resultado estiver incerto; o reenvio recupera o comprovante.
Após sucesso, o saldo é recarregado e o histórico refaz a consulta ao ser aberto.

## Verificação

Prisma validado e cliente gerado; migração aplicada.
Builds backend/frontend e verificações pontuais de valores, precisão, idempotência, conflito de chave, saldo insuficiente, permissões, isolamento de comprovantes, destinatário inativo, origem do histórico, bloqueio do formato legado e reversão após falha.
Verificações financeiras usam dados temporários dentro de transação revertida; nenhum pagamento de teste permanece no banco.
Duas conexões PostgreSQL verificaram a exclusão mútua da chave e da carteira, sem alterar saldos.
Verificação HTTP confirma JWT obrigatório, proibição do pagador enviado pelo cliente, bloqueio da Xerox para pagar e remoção da rota antiga.
Não foi realizada automação visual no navegador.

## Arquivos desta implementação

Backend:
- backend/prisma/schema.prisma
- backend/prisma/migrations/20261112000000_student_payments/migration.sql
- backend/src/ecocoins/dto/create-payment.dto.ts (novo)
- backend/src/ecocoins/payments.service.ts (novo)
- backend/src/ecocoins/ecocoins.controller.ts
- backend/src/ecocoins/ecocoins.service.ts
- backend/src/ecocoins/ecocoins.module.ts
- backend/src/ecocoins/dto/create-redemption.dto.ts (removido)

Frontend:
- frontend/src/auth/paymentPermission.ts (novo)
- frontend/src/services/payments.ts (novo)
- frontend/src/utils/payment.ts (novo)
- frontend/src/components/PaymentReceipt.tsx (novo)
- frontend/src/pages/PaymentReceiptPage.tsx (novo)
- frontend/src/pages/student/SendPaymentPage.tsx (novo)
- frontend/src/pages/xerox/ReceivedPaymentsPage.tsx (novo)
- frontend/src/layouts/StudentLayout.tsx
- frontend/src/layouts/XeroxLayout.tsx
- frontend/src/pages/student/DashboardPage.tsx
- frontend/src/pages/student/EcoCoinsPage.tsx
- frontend/src/pages/HomePage.tsx
- frontend/src/pages/LoginPage.tsx
- frontend/src/routes/AppRoutes.tsx
- frontend/src/services/student.types.ts
- frontend/src/pages/xerox/RedemptionsPage.tsx (removido)
- frontend/src/services/xerox.ts (removido)
- frontend/src/utils/redemption.ts (removido)

Documentação:
- docs/student-payments.md (novo)
- docs/redemptions.md (marcado como fluxo histórico)
