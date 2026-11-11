# Carteiras e créditos de EcoCoins

## Regras e precisão

- Cada conta com STUDENT recebe uma carteira única, inicialmente com saldo zero. A migração cria carteiras ausentes; um trigger cria a carteira quando STUDENT é atribuído no cadastro ou em alteração de perfis.
- Remover STUDENT não apaga carteira, saldo ou movimentações. Consultas próprias continuam exigindo o perfil STUDENT.
- A taxa fixa é 10 EcoCoins por quilograma aprovado: `peso histórico em gramas × 10 / 1000`.
- 1 kg gera 10,00 EcoCoins; 120 g geram 1,20; 1 g gera 0,01. Gramas inteiras produzem centésimos exatos, sem cálculos em ponto flutuante.
- Cada EcoCoin representa R$ 0,10 de desconto. Esse valor unitário é armazenado na movimentação para preservar a referência histórica. Resgates na Xerox foram implementados conforme docs/redemptions.md, com conversão exata em centavos e sem arredondamento.
- Saldos, quantidades de moedas e saldos após movimentação usam Decimal(14,2), com restrições de não negatividade/valor positivo. A API retorna strings com duas casas, por exemplo `"10.01"`, para preservar a precisão.

## Crédito transacional na aprovação

Não existe endpoint de concessão manual. O `PATCH /api/disposals/:id/approve`, já existente, aprova e credita na mesma transação:

1. Valida a Biblioteca, impede autoaprovação, bloqueia a solicitação e valida estado, recebimento, conferência e snapshots de peso.
2. Grava o estado APPROVED, a justificativa, o responsável e a taxa histórica 10 EcoCoins/kg.
3. Confirma que o solicitante mantém um perfil STUDENT ativo e que ainda não existe crédito para o descarte.
4. Bloqueia a carteira, incrementa o saldo com Decimal e grava uma movimentação CREDIT com origem no descarte, quantidade, saldo resultante, data, responsável e valor unitário em reais.
5. Registra o evento de aprovação. Qualquer falha reverte o conjunto, sem aprovação ou saldo parcial.

A trava da carteira serializa créditos de descartes diferentes para o mesmo estudante. O vínculo único EcoCoinMovement.disposalRequestId impede duplicação, além da transição terminal da aprovação e da validação no service. O histórico de movimentações é protegido contra UPDATE/DELETE no PostgreSQL.

O banco também valida os novos créditos de descarte: origem aprovada e conferida, ator da Biblioteca ativo, ausência de ADMIN/XEROX ativos, destinatário, peso histórico, quantidade de moedas, saldo resultante e valor unitário de R$ 0,10. Pesos do catálogo, itens declarados e divergências não são modificados.

O cálculo usa o total histórico da solicitação aprovada integralmente. Não há aprovação parcial nem substituição automática das quantidades declaradas pelas quantidades observadas nas divergências.

## Rotas de consulta

Todas exigem JWT. Não recebem identificador de estudante ou carteira para alterar o proprietário da consulta.

| Método | Rota | Acesso |
| --- | --- | --- |
| GET | /api/ecocoins/wallet | STUDENT: somente sua carteira e referências de conversão. |
| GET | /api/ecocoins/movements | STUDENT: somente suas movimentações. |
| GET | /api/ecocoins/credits | LIBRARY elegível: créditos de descartes em que participou do recebimento, conferência ou aprovação. |

As duas listagens aceitam `page` (padrão 1), `pageSize` (padrão 20, máximo 100) e o filtro opcional `disposalRequestId`. Retornam `{data,total,page,pageSize}`; o filtro nunca remove o escopo de acesso. Créditos de um descarte não processado pelo usuário retornam lista vazia.

O retorno das movimentações contém quantidade, descrição, data, responsável e origem com descarte, peso, taxa e valor unitário histórico. Apenas o estudante recebe `balanceAfter` da própria carteira. A Biblioteca recebe a identificação do estudante e os créditos pertinentes, sem consultar o saldo total da carteira.

ADMIN e XEROX não concedem créditos de descarte nem utilizam a consulta exclusiva da Biblioteca. A aprovação já exige LIBRARY sem esses perfis; o service de EcoCoins repete a verificação e o PostgreSQL valida o responsável.

## Migração

`20261111030000_wallets_and_disposal_credits`:

- Verifica a precisão antiga antes de converter de quatro para duas casas. Se houver valores não representáveis, interrompe sem arredondar os históricos.
- Acrescenta coinValueBrlSnapshot para preservar a referência monetária dos novos créditos.
- Cria as carteiras zeradas ausentes e a criação automática por atribuição de STUDENT, preservando saldos existentes.
- Acrescenta validações de crédito e proteção do histórico, mantendo as chaves únicas, pesos fixos, contas e permissões anteriores.

A verificação local não encontrou saldos/movimentações antigos nem descartes aprovados sem crédito. A migração não concede créditos retroativos automaticamente e não altera aprovações ou históricos anteriores. As novas aprovações passam obrigatoriamente pela transação de crédito.

## Verificação realizada

O build do backend passou. A verificação pontual usou dados temporários revertidos e conferiu criação automática de carteiras, taxa de 10 por kg, fração de 0,01, unicidade por descarte, isolamento entre estudantes, consulta da Biblioteca limitada ao processamento e rollback de aprovação, saldo e movimentação após falha simulada.

## Resgates na Xerox

O endpoint POST /api/ecocoins/redemptions registra resgates exclusivamente por XEROX, com estudante, quantidade e chave UUID de idempotência. A cada EcoCoin corresponde R$ 0,10; somente múltiplos de 0,10 EcoCoin são resgatáveis. Débito e movimentação são atômicos e não permitem saldo negativo. STUDENT consulta os resgates pelo histórico existente. ADMIN e LIBRARY não registram resgates. Consulte docs/redemptions.md para exemplos, repetição segura e regras de concorrência. Não há estornos ou ajustes manuais.
