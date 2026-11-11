# Perfis e permissões do EcoTroca

## Regras definitivas

| Chave preservada | Nome exibido | Responsabilidade |
| --- | --- | --- |
| STUDENT | Estudante | Solicitar descartes, acompanhar suas solicitações e utilizar EcoCoins. |
| LIBRARY | Administrador da Biblioteca | Receber e conferir equipamentos, aprovar descartes e conceder EcoCoins. |
| XEROX | Administrador da Xerox | Receber EcoCoins em resgates e debitar o saldo do estudante. |
| ADMIN | Administrador técnico | Manutenção técnica; somente este perfil gerencia categorias e equipamentos. |

O fluxo de solicitações de descarte está implementado conforme docs/disposals.md. Carteiras e créditos na aprovação estão implementados conforme docs/ecocoins.md. Resgates e débitos transacionais da Xerox estão implementados conforme docs/redemptions.md.

ADMIN não pode coexistir com LIBRARY nem XEROX na mesma conta, mesmo se uma dessas associações estiver inativa. A API valida a regra no cadastro administrativo e na substituição de perfis. A substituição usa transação e bloqueio da conta, sem deixar alterações parciais se ocorrer erro.

No PostgreSQL, um trigger também protege inserções e atualizações em UserAccessProfile contra combinações proibidas. As atribuições à mesma conta são serializadas para prevenir conflitos concorrentes. As quatro chaves centrais de AccessProfile são protegidas contra renomeação; nomes e descrições seguem separados dos identificadores internos.

LIBRARY e XEROX continuam distintos, sem herança de permissões ou transformação em ADMIN. A regra proíbe a combinação do técnico com qualquer um dos dois operacionais. Ela não acrescenta outras proibições, como STUDENT com ADMIN ou a associação explícita dos dois perfis operacionais; nenhum vínculo existente é removido automaticamente.

## Rotas existentes

- Cadastro público e login continuam públicos; o cadastro público sempre cria STUDENT. A saúde da API permanece pública.
- Gerenciamento de contas e atribuição de perfis exigem ADMIN.
- Cadastro, edição, ativação/desativação e listagens completas de categorias e equipamentos exigem ADMIN.
- STUDENT e ADMIN consultam categorias/equipamentos ativos.
- A consulta de definições de perfis exige autenticação.
- LIBRARY e XEROX não acessam o painel técnico nem passam a administrar o catálogo.
- STUDENT cria e acompanha suas solicitações de descarte; LIBRARY elegível recebe, confere e decide. ADMIN e XEROX não executam etapas exclusivas da Biblioteca.

## Todos os pesos são imutáveis

O peso de cada equipamento é definido uma única vez, na criação por ADMIN. Não pode ser alterado depois por nenhum perfil, mesmo após renomeação, troca de categoria ou mudança de status. A API rejeita o campo de peso na atualização, inclusive se o cliente enviar o valor atual. Os demais dados continuam editáveis pelo administrador técnico.

O trigger Equipment_weight_immutable no PostgreSQL bloqueia qualquer UPDATE que efetivamente altere averageWeightGrams, para todos os equipamentos. Um UPDATE que apenas repete o valor atual não altera o peso e é permitido no banco. As proteções anteriores dos valores oficiais e sua identidade persistente continuam válidas.

| Equipamento existente | Peso fixo em gramas |
| --- | ---: |
| Caixa de som (mini portátil) | 250 |
| Liquidificador (plástico simples) | 750 |
| Notebook (ultrabook / leve) | 1000 |
| Monitor (LED ultrafino) | 1500 |
| Rádio (pequeno) | 250 |
| Impressora (jato de tinta compacta) | 2000 |
| Modem / Roteador | 250 |
| Estabilizador (linha leve) | 1250 |
| Mouse | 120 |

A carga inicial não modifica pesos existentes; caso encontre peso incompatível, interrompe e reverte a transação. Ela não é executada automaticamente.

## Migração e preservação

A migração 20261111000000_immutable_weights_and_separate_admin cria funções e triggers. Não reescreve pesos, contas, senhas, associações, timestamps ou históricos. O trigger de atribuições usa uma atualização sem mudança de valor na linha da conta para garantir exclusão mútua em concorrência, sem modificar updatedAt ou outros campos.

Antes de aplicar, a migração verifica contas com ADMIN e LIBRARY/XEROX. Se encontrar conflitos em outro ambiente, interrompe integralmente; a resolução deve ser explícita, sem exclusão de usuários ou escolha automática de perfis. A consulta local anterior à aplicação não encontrou contas conflitantes e confirmou os nove pesos acima.

Não há decisões pendentes sobre gerenciamento do catálogo, imutabilidade de pesos ou separação do perfil técnico: essas regras foram confirmadas e implementadas.

## Conferência e impedimento pessoal

A Biblioteca pode registrar divergências por item na rota de conferência existente, preservando a declaração original. Nenhum usuário pode aprovar a própria solicitação, mesmo que possua os perfis Estudante e Administrador da Biblioteca. Rejeições antes do recebimento permanecem permitidas com justificativa obrigatória. Consulte docs/disposals.md para o formato dos dados.


## Carteiras e créditos

STUDENT consulta apenas sua carteira e movimentações. LIBRARY elegível consulta apenas créditos de descartes em que participou do recebimento, conferência ou aprovação, sem acesso ao saldo total do estudante. O crédito é automático e transacional na aprovação, a 10 EcoCoins/kg, com histórico e responsável. Não há endpoint manual de concessão. ADMIN e XEROX não podem conceder esses créditos. Cada EcoCoin tem referência histórica de R$ 0,10; resgates na Xerox estão implementados conforme docs/redemptions.md.


## Resgates

Somente XEROX ativo, sem perfis ADMIN ou LIBRARY ativos, registra resgates. O destinatário deve ser estudante ativo e ter saldo suficiente. STUDENT consulta apenas seus resgates pelo histórico próprio. Não há acesso genérico à carteira de terceiros, estornos ou ajustes manuais. Repetições usam a mesma chave UUID para impedir débito duplicado.
