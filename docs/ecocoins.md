# Carteiras e créditos

Cada STUDENT tem uma carteira única criada por trigger na atribuição do perfil, com Decimal(14,2) e saldo não negativo. Remover perfil não apaga carteira/histórico. Consultas exigem o perfil apropriado e são limitadas ao ator autenticado.

Novas aprovações concedem 10 EcoCoins/kg calculados exclusivamente de quantityObserved de cada item × peso unitário histórico. 1 kg = 10,00 EcoCoins; 120 g = 1,20. Todos os itens precisam de quantidade conferida válida, inclusive sem divergência; total aprovado deve ser positivo. Declarações originais/snapshots e aprovações anteriores são preservados, sem recálculo retroativo.

PATCH /api/disposals/:id/approve exige LIBRARY elegível, bloqueia autoaprovação e transições inválidas. A mesma transação bloqueia solicitação/carteira, valida conferência e taxa, aprova, incrementa saldo e registra CREDIT e evento. Falha reverte o conjunto. O vínculo único disposalRequestId impede dois créditos para o mesmo descarte; PostgreSQL valida origem/autorização e protege históricos contra alteração/exclusão.

| Consulta | Permissão |
| --- | --- |
| GET /api/ecocoins/wallet | STUDENT, somente própria carteira |
| GET /api/ecocoins/movements | STUDENT, somente histórico próprio |
| GET /api/ecocoins/credits | LIBRARY, somente descartes em que participou do recebimento/conferência/aprovação |

Listas aceitam page, pageSize (máximo 100) e disposalRequestId opcional; filtro não amplia autorização. Não há concessão manual por ADMIN/XEROX nem consulta de saldo de estudantes pela Xerox.

Pagamentos atuais são iniciados exclusivamente pelo estudante: veja [student-payments.md](student-payments.md). 1 EcoCoin = R$ 0,10; moedas têm duas casas e o equivalente pode ter três (0,01 = R$ 0,001), sem arredondamento. Não se exige múltiplo de 0,10 nos novos pagamentos. Resgates antigos permanecem apenas em histórico; POST /api/ecocoins/redemptions foi removido. Não há estornos, ajustes ou integração bancária.
