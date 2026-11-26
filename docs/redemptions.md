# Resgates legados — fluxo desativado

Este documento descreve somente a preservação histórica. O modelo em que XEROX informava estudante/quantidade e iniciava um débito foi substituído por [pagamentos iniciados pelo estudante](student-payments.md).

POST /api/ecocoins/redemptions não está registrado e retorna 404 a usuários autenticados. Não utilize esse caminho em integração ou apresentação. A Xerox apenas consulta seus recebimentos/comprovantes. O PostgreSQL também recusa novas movimentações no formato antigo.

Resgates anteriores continuam no histórico do estudante e na consulta de pagamentos do operador Xerox correspondente. Seus identificadores, redemptionKey, valores, datas, responsáveis e comprovantes permanecem preservados, sem conversão em novos pagamentos ou alteração de saldo.

A antiga regra de múltiplos de 0,10 EcoCoin era exclusiva do resgate legado. Novos pagamentos aceitam qualquer valor positivo com até duas casas, preservam equivalente exato em reais com três casas e são confirmados pelo estudante autenticado. Não há estorno ou ajuste manual.
