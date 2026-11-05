# Perfis e permissões do EcoTroca

## Identificadores preservados e responsabilidades

| Chave interna | Nome exibido (pt-BR) | Responsabilidade definitiva |
| --- | --- | --- |
| STUDENT | Estudante | Solicitar descartes, acompanhar suas solicitações e utilizar seus EcoCoins. |
| LIBRARY | Administrador da Biblioteca | Receber e conferir equipamentos, aprovar descartes e conceder EcoCoins aos estudantes. |
| XEROX | Administrador da Xerox | Receber EcoCoins em resgates, debitando o saldo do estudante. |
| ADMIN | Administrador técnico | Manutenção técnica do sistema, sem herdar permissões operacionais de outros perfis. |

Os fluxos de descarte e EcoCoins ainda não foram implementados. Essas responsabilidades não criam rotas operacionais nesta etapa. Os guards exigem os perfis explicitamente declarados em cada rota; ADMIN não é um superusuário implícito.

## Rotas existentes

- Cadastro público e login permanecem públicos; cadastro público sempre cria STUDENT. A rota de saúde permanece pública.
- Gerenciamento de contas e atribuição de perfis continuam restritos a ADMIN, como manutenção técnica.
- Gerenciamento de categorias/equipamentos e listagens completas permanecem em ADMIN até confirmação de quem administrará operacionalmente o catálogo.
- Consultas de categorias e equipamentos ativos continuam disponíveis para STUDENT e ADMIN.
- A consulta de definições de perfis continua disponível a usuários autenticados.
- LIBRARY e XEROX não recebem acesso ao painel de manutenção nem às operações técnicas por terem nomes de administradores operacionais.
- Os nomes são exibidos em português na interface, inclusive em sessões antigas. As chaves internas e as associações existentes não são substituídas.

## Oito pesos oficiais fixos

| Equipamento | Gramas por unidade |
| --- | ---: |
| Caixa de som (mini portátil) | 250 |
| Liquidificador (plástico simples) | 750 |
| Notebook (ultrabook / leve) | 1000 |
| Monitor (LED ultrafino) | 1500 |
| Rádio (pequeno) | 250 |
| Impressora (jato de tinta compacta) | 2000 |
| Modem / Roteador | 250 |
| Estabilizador (linha leve) | 1250 |

`Equipment.officialCatalogKey` identifica persistentemente cada item. A API não permite editar essa chave e valida o peso mesmo se houver renomeação ou mudança de categoria. A criação por nome oficial ou alias conhecido também exige o peso correto e registra a identidade oficial. A chave única impede duplicar um item oficial em outra categoria.

Uma restrição CHECK no PostgreSQL também exige o peso correspondente à identidade oficial. Nenhum perfil da aplicação, incluindo ADMIN, pode alterar esses oito pesos. A migração mantém IDs, status e vínculos; só identifica/corrige o catálogo e atualiza rótulos e descrições dos perfis. Ela não altera contas, senhas, associações de perfis, descartes, snapshots, carteiras nem movimentações. Se houver correspondências ambíguas em outro ambiente, a migração é revertida, sem eliminar registros.

O script de carga compartilha as mesmas definições de pesos do backend e não é executado automaticamente. O Mouse permanece fora da tabela oficial, com 120 g no catálogo existente. Os demais pesos continuam sob a regra de manutenção técnica atual.

## Decisões que ainda exigem confirmação

1. O gerenciamento do catálogo ficará com o administrador técnico ou será transferido ao Administrador da Biblioteca? A Biblioteca e a Xerox precisam de consulta ao catálogo fora de seus futuros fluxos?
2. Os pesos de equipamentos não oficiais, como Mouse, devem continuar editáveis pelo administrador técnico ou também deverão ser fixos?
3. Uma mesma conta poderá acumular perfis técnicos e operacionais? O modelo atual permite múltiplos perfis; nenhuma associação existente foi removida.