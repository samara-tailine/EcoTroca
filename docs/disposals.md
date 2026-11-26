# Solicitações e conferência de descartes

Todas as rotas usam /api e JWT. STUDENT cria para si e consulta somente solicitações próprias; LIBRARY elegível consulta a fila completa. ADMIN/XEROX não executam operações da Biblioteca, inclusive em combinações de perfis.

| Método | Rota | Acesso |
| --- | --- | --- |
| POST | /api/disposals | STUDENT |
| GET | /api/disposals | STUDENT próprias; LIBRARY fila |
| GET | /api/disposals/:id | Mesma visibilidade |
| PATCH | /api/disposals/:id/receive | LIBRARY |
| PATCH | /api/disposals/:id/check | LIBRARY |
| PATCH | /api/disposals/:id/approve | LIBRARY, sem autoaprovação |
| PATCH | /api/disposals/:id/reject | LIBRARY |

Listagem: status opcional, page e pageSize (máximo 100). Criação aceita items com um a 100 equipamentos distintos: equipmentId, quantity inteira positiva, physicalCondition, functionality e photoUrl opcional HTTP/HTTPS. Equipamento e categoria precisam estar ativos. Peso/nome são capturados como snapshots; pesos enviados pelo cliente não são usados.

Condição física: Novo, Bom, Regular, Danificado. Funcionamento: Funciona, Funciona parcialmente, Não funciona. Não há upload: fotos são somente URLs.

Fluxo: PENDING → RECEIVED → IN_REVIEW → APPROVED. receive recebe notes opcional. check exige lista completa de itens, mesmo sem divergências:

~~~json
{
  "items": [{"itemId":"UUID_DO_ITEM", "quantityObserved":2}],
  "notes":"Conferência concluída",
  "divergences":[{"itemId":"UUID_DO_ITEM", "description":"Quantidade menor que a declarada"}]
}
~~~

divergences e notes são opcionais. Cada item deve aparecer exatamente uma vez em items; quantityObserved é inteiro não negativo. A narrativa pode incluir condição/funcionamento observados e quantidade opcional coerente com items. Os dados originais do estudante não são substituídos. Conferência antiga incompleta pode ser completada no estado IN_REVIEW sem duplicar divergência já registrada.

Peso conferido = soma(quantityObserved × averageWeightGramsSnapshot); total máximo 2.147.483.647 g. A conferência pode registrar zero, mas aprovação exige total positivo e todos os itens conferidos. Não existe fallback para quantidade declarada em novas aprovações.

approve exige justification, recebimento/conferência completos e consistência dos totais. Aprovação, crédito de 10 EcoCoins/kg e histórico são transacionais. Ninguém aprova a própria solicitação. reject exige justification em PENDING, RECEIVED ou IN_REVIEW. Estados finais não reabrem e operações repetidas/inválidas são bloqueadas.

quantity, nomes/pesos unitários e totalWeightGramsSnapshot permanecem para auditoria. quantityObserved e totalWeightGramsObserved são separados. Aprovações e movimentações históricas não foram recalculadas; exibição legada pode usar snapshots declarados quando não existe total conferido. A migração 20261122010000_observed_disposal_quantities é aditiva e não faz backfill financeiro.

Não há edição/exclusão de solicitações, upload, cancelamento público ou crédito manual. Criação de descarte não tem idempotencyKey: diante de resposta de rede incerta, consulte o histórico antes de criar novamente. Pagamentos possuem proteção própria de idempotência.
