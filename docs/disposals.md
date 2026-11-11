# Solicitações de descarte

O módulo utiliza os guards JWT e de perfis existentes. O ator sempre vem da sessão autenticada, nunca do corpo da requisição. Mensagens, validações, resumos do Swagger e rótulos de status estão em português brasileiro.

## Rotas

Todas as rotas exigem Bearer JWT e usam o prefixo global `/api`.

| Método | Caminho | Perfis e acesso |
| --- | --- | --- |
| POST | /api/disposals | STUDENT: cria para si mesmo. |
| GET | /api/disposals | STUDENT: somente próprias; LIBRARY elegível: fila completa. |
| GET | /api/disposals/:id | Mesma visibilidade, incluindo itens e histórico. Solicitação de outro estudante retorna 404. |
| PATCH | /api/disposals/:id/receive | Exclusivo da Biblioteca: registra recebimento. |
| PATCH | /api/disposals/:id/check | Exclusivo da Biblioteca: registra conferência completa. |
| PATCH | /api/disposals/:id/approve | Exclusivo da Biblioteca: aprova após recebimento e conferência. |
| PATCH | /api/disposals/:id/reject | Exclusivo da Biblioteca: rejeita solicitação aberta. |

ADMIN e XEROX não executam etapas da Biblioteca. A validação é feita no controller e no service. Por precaução, contas que também tenham ADMIN ou XEROX não utilizam as operações da Biblioteca, mesmo se tiverem LIBRARY. Associações existentes não são modificadas. Uma conta com STUDENT continua podendo agir como estudante nas próprias solicitações.

Uma conta com LIBRARY elegível visualiza a fila completa, mesmo que também tenha STUDENT. Sem LIBRARY elegível, a consulta fica restrita às próprias solicitações se a conta tiver STUDENT.

## Criação

```json
{
  "items": [
    {
      "equipmentId": "UUID_DO_EQUIPAMENTO",
      "quantity": 2,
      "physicalCondition": "Bom",
      "functionality": "Funciona",
      "photoUrl": "https://exemplo.test/foto.jpg"
    }
  ]
}
```

- Um a 100 equipamentos diferentes por solicitação. Repetições devem ser representadas pela quantidade, pois a relação existente é única por equipamento/solicitação.
- Equipamento e categoria precisam estar ativos na criação. Um bloqueio de leitura impede desativação/troca durante a captura dos dados.
- Quantidade inteira positiva. O total precisa caber no campo inteiro de gramas existente: até 2.147.483.647 g. Cálculos intermediários usam BigInt para evitar arredondamento/overflow.
- Condição física obrigatória: Novo, Bom, Regular ou Danificado. Funcionamento obrigatório: Funciona, Funciona parcialmente ou Não funciona. As opções devem ser enviadas exatamente com esses rótulos em pt-BR; espaços externos são removidos. Textos livres anteriores permanecem preservados nos registros históricos.
- Foto opcional: URL HTTP/HTTPS de até 2048 caracteres, ou campo omitido/null. O servidor não busca a imagem nem recebe upload nesta etapa.
- Não se aceitam pesos do cliente para o cálculo. São copiados do catálogo fixo, junto com quantidade e nome do equipamento; o total fica gravado na solicitação.
- Um item com quantidade maior que um compartilha a descrição de condição/funcionamento entre suas unidades.

A consulta aceita `?status=PENDING&page=1&pageSize=20`, com até 100 solicitações por página. Retorna `{data,total,page,pageSize}`. Os identificadores de status permanecem internos em inglês; `statusLabel` e os rótulos do histórico vêm em pt-BR.

## Fluxo e decisões

Fluxo de aprovação: `PENDING → RECEIVED → IN_REVIEW → APPROVED`.

- `receive`: corpo `{}` ou `{"notes":"Recebidos na Biblioteca"}`. Registra data, ator e histórico.
- `check`: aceita observações e a lista opcional de divergências por item, conforme exemplo abaixo. Só é permitido após receber. Registra a conferência e encaminha para análise; não modifica os dados declarados pelo estudante nem os snapshots.
- `approve`: corpo `{"justification":"Todos os itens recebidos e conferidos"}`. Exige recebimento e conferência registrados e consistência do total com os snapshots dos itens. O usuário não pode aprovar a própria solicitação, inclusive se possuir STUDENT e LIBRARY. O bloqueio existe no service e em uma restrição do PostgreSQL.
- `reject`: corpo `{"justification":"Motivo da rejeição"}`. Pode ocorrer em PENDING, RECEIVED ou IN_REVIEW.
- APPROVED, REJECTED e o CANCELLED legado são terminais. Não há endpoint de reabertura, edição de itens, exclusão ou cancelamento nesta etapa.
- Repetições e transições fora do fluxo retornam 409. Cada alteração usa transação, bloqueio de linha e atualização condicionada ao estado anterior; status e evento são gravados atomicamente.

## Modelos e migração

`20261111010000_disposal_requests_workflow` acrescenta RECEIVED, dados declarados/foto/nome do item, total de peso e datas de recebimento/conferência. A tabela DisposalStatusHistory registra estado anterior, novo estado, ator, observações e data.

Novos totais e nomes são snapshots. A aprovação valida o total a partir dos snapshots, sem consultar novamente pesos do catálogo. Equipamentos desativados posteriormente continuam presentes no histórico.

Campos novos dos itens são nullable para preservar registros legados, mas obrigatórios nas novas requisições via DTO. Totais legados derivam dos snapshots anteriores, quando representáveis; registros sem total conhecido não podem ser aprovados sem revisão. O histórico legado recebe somente um registro de estado anterior, sem reconstruir etapas desconhecidas. No banco local não havia solicitações antes desta implementação.

A taxa de conversão existente passa a permitir null, preservando quaisquer valores antigos. Novas solicitações ainda não definem taxa de conversão. Na aprovação, a taxa de 10 EcoCoins/kg é registrada e o crédito é concedido na mesma transação, conforme docs/ecocoins.md. Recebimento, conferência e rejeição não concedem créditos.

Pesos fixos, contas, associações de perfis e autenticação são preservados. O guard JWT recebeu apenas uma mensagem padrão em pt-BR para sessão ausente/inválida.

## Regras confirmadas e limites desta etapa

1. Condição e funcionamento foram padronizados. Descrições livres antigas não são reescritas.
2. Qual será o armazenamento de fotos e o fluxo de upload? Nesta etapa só há referência por URL.
3. Divergências são registradas por linha de equipamento, com valores observados separados. Não há alteração do total original ou aprovação parcial nesta etapa.
4. A rejeição antes do recebimento está confirmada e sempre exige justificativa.
5. Autoaprovação está proibida, independentemente da combinação de perfis autorizados.

As regras de créditos estão implementadas conforme docs/ecocoins.md. Resgates e débitos são tratados separadamente pelo módulo ecocoins, conforme docs/redemptions.md.
## Conferência com divergências

A rota existente `PATCH /api/disposals/:id/check` aceita:

```json
{
  "notes": "Uma unidade apresentou divergências na conferência.",
  "divergences": [
    {
      "itemId": "UUID_DO_ITEM_DA_SOLICITACAO",
      "description": "Foi entregue somente uma unidade, com avaria e sem funcionamento.",
      "quantityObserved": 1,
      "physicalConditionObserved": "Danificado",
      "functionalityObserved": "Não funciona"
    }
  ]
}
```

`description` é obrigatória para cada divergência, com até 2000 caracteres. Os valores observados são opcionais, mas, se informados, devem seguir as opções padronizadas. `quantityObserved` aceita zero para representar um item não entregue. A lista é opcional; `{}` ou uma lista vazia continuam válidos quando não há divergências.

Cada divergência deve apontar para um item desta solicitação. Itens repetidos ou pertencentes a outra solicitação são recusados antes da gravação. Há uma entrada por linha de equipamento, com identificação do responsável e data. As divergências são salvas na mesma transação da conferência e do evento de status, sem reabrir etapas já finalizadas.

As consultas existentes retornam `items[].divergence`, incluindo os dados observados e o responsável. `quantity`, `physicalCondition`, `functionality`, `photoUrl`, o peso unitário e o total declarado continuam representando os dados originais. Quantidades observadas diferentes não recalculam o peso nem geram créditos por si só. O crédito ocorre somente na aprovação integral, sobre o total histórico original.

## Migração de padronização e divergências

`20261111020000_disposal_conditions_and_divergences` cria DisposalItemDivergence e suas relações e acrescenta restrições de opções válidas e de proibição de autoaprovação. Não altera registros existentes. Os CHECKs dos campos legados usam NOT VALID para preservar eventuais descrições livres e aprovações antigas; o PostgreSQL os aplica normalmente a novas inserções e atualizações. Nenhum dado anterior é normalizado, apagado ou reinterpretado automaticamente.

A consulta local anterior à migração encontrou zero solicitações, zero itens e nenhuma autoaprovação anterior. A foto continua opcional por URL HTTP/HTTPS, sem upload. Perfis, autenticação, transições já existentes e pesos fixos não foram alterados. A etapa de padronização não criou endpoints novos. Os créditos posteriores foram integrados à aprovação conforme docs/ecocoins.md; não há frontend de descartes ou EcoCoins.