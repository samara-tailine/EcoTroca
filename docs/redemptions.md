# Resgates de EcoCoins na Xerox

## Endpoint criado

`POST /api/ecocoins/redemptions`, com JWT de um operador XEROX ativo. ADMIN e LIBRARY são recusados, inclusive em contas que também tenham XEROX ativo. STUDENT sem XEROX também não pode registrar resgates.

```json
{
  "studentId": "UUID_DO_ESTUDANTE",
  "amount": "5.00",
  "idempotencyKey": "UUID_UNICO_DA_OPERACAO"
}
```

`amount` pode ser enviado como string decimal (recomendado) ou número. Deve ser positivo, sem sinal/expoente, usando ponto como separador, com até duas casas decimais e 12 dígitos inteiros. O estudante precisa existir, estar ativo e possuir perfil STUDENT ativo e carteira com saldo suficiente.

O retorno é um comprovante com ID, chave de idempotência, estudante, operador, quantidade de EcoCoins, desconto em reais, valor unitário e data. Não expõe o saldo total do estudante ao operador da Xerox.

## Conversão exata confirmada

Cada EcoCoin vale R$ 0,10. Os resgates devem usar múltiplos de 0,10 EcoCoin para produzir descontos exatos em centavos, sem arredondamento. Exemplos:

| EcoCoins utilizados | Desconto em reais |
| ---: | ---: |
| 0,10 | R$ 0,01 |
| 1,20 | R$ 0,12 |
| 5,00 | R$ 0,50 |
| 10,00 | R$ 1,00 |

Um pedido de 0,01 EcoCoin é recusado, pois geraria R$ 0,001. Os centésimos que ainda não formam um múltiplo resgatável permanecem na carteira, sem perda de saldo.

## Idempotência e requisições simultâneas

O cliente gera um UUID para cada operação lógica. Em caso de timeout, resposta perdida ou repetição, deve reenviar a mesma chave com o mesmo estudante e quantidade.

- Mesma chave, operador, estudante e quantidade: retorna o comprovante já gravado, sem novo débito.
- Mesma chave com outro operador, estudante ou quantidade: retorna 409, sem novo débito nem exposição do comprovante de outro operador.
- Nova chave significa uma nova operação; não se deve gerar outra chave para repetir um resgate cujo resultado ficou incerto.
- Apenas operações concluídas ficam registradas. Se uma transação falhar e for revertida, é possível repetir a mesma chave.
- A repetição de uma operação concluída apenas consulta seu comprovante; não refaz o débito nem reprocessa a atividade atual do estudante.

A transação obtém uma trava consultiva pela chave, verifica o registro anterior e bloqueia as contas para preservar a checagem de atividade. Em seguida bloqueia a carteira, verifica o saldo e faz um decremento condicionado a saldo suficiente. A movimentação DEBIT é inserida na mesma transação. Falhas revertem saldo e histórico juntos.

A chave também tem índice único no PostgreSQL. Chaves diferentes competem pelo bloqueio da mesma carteira e não podem consumir mais saldo que o disponível. As restrições de saldo não negativo continuam válidas. Conflitos e timeouts transacionais retornam mensagem em pt-BR orientando repetir a mesma chave.

## Histórico do estudante

Não foi criado endpoint adicional de consulta. O existente `GET /api/ecocoins/movements` continua limitado à carteira do estudante autenticado e agora identifica a origem XEROX_REDEMPTION com o rótulo Resgate na Xerox.

O registro traz quantidade, saldo após a operação para o próprio estudante, data, operador responsável, chave, estudante e desconto em reais. Créditos anteriores e a consulta da Biblioteca não são alterados.

## Migração e garantias

`20261111040000_xerox_redemptions` acrescenta redemptionKey (UUID único) e redemptionValueBrl (Decimal(14,2)) ao modelo EcoCoinMovement. O estudante continua identificado pela carteira e o operador por createdByUserId; o proprietário da carteira passa a ser imutável no banco.

Novos débitos são validados no PostgreSQL: precisam corresponder a um resgate com chave, operador XEROX ativo sem ADMIN/LIBRARY ativos, estudante ativo, snapshot unitário R$ 0,10, desconto exato e saldo resultante coerente. As proteções anteriores de crédito, saldo e histórico imutável continuam em vigor.

A migração não reescreve saldos nem créditos ou débitos anteriores. Não há frontend, estorno, débito de ajuste ou concessão manual nesta etapa.

## Verificações realizadas

Build do backend e verificação pontual com dados revertidos: débito e comprovante, repetição sem novo débito, conflito de chave, saldo insuficiente, atividade/perfil do estudante, restrição de operador, conversão exata, histórico isolado e reversão após falha simulada. Duas conexões confirmaram a exclusão mútua da trava de idempotência; o índice único foi verificado sem gravações. A conferência não deixou dados de teste persistidos.