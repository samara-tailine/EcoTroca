# Perfis, permissões e catálogo

| Chave | Responsabilidade |
| --- | --- |
| STUDENT | Próprios descartes, carteira, histórico e pagamentos à Xerox. |
| LIBRARY | Receber, conferir, aprovar/rejeitar e consultar créditos de descartes que processou. |
| XEROX | Consultar somente seus pagamentos recebidos e comprovantes; não iniciar débitos. |
| ADMIN | Gerenciar usuários, perfis, categorias e equipamentos. Sem privilégios operacionais implícitos. |

ADMIN+LIBRARY, ADMIN+XEROX e LIBRARY+XEROX são proibidos na API e por trigger PostgreSQL, incluindo atribuições associadas a perfis inativos. STUDENT pode coexistir com um dos outros; pagamentos exigem STUDENT sem qualquer perfil administrativo. Não há herança operacional. Autoaprovação de descarte é proibida.

Cadastro público tradicional/Google sempre cria STUDENT. Somente ADMIN cria contas administrativas/atribui perfis. PATCH de dados não aceita atribuição de perfis: use PUT /api/users/:id/access-profiles. As quatro chaves internas não podem ser renomeadas. Nenhuma conta conflitante é corrigida automaticamente pelas migrações.

Gestão de usuários, categorias e equipamentos exige ADMIN. STUDENT/ADMIN consultam catálogo ativo. LIBRARY não gerencia catálogo; XEROX não consulta carteira alheia. Auth/me consulta somente a própria conta. JWTStrategy verifica atividade e perfis no banco em cada chamada; o frontend sincroniza mudanças de permissões e restringe menus/rotas.

Todos os pesos são definidos na criação e imutáveis para qualquer perfil, inclusive ADMIN, pela API e pelo trigger Equipment_weight_immutable. Alterar nome, categoria ou situação não libera alteração do peso. Não há exclusão de históricos ou alteração financeira manual.

| Equipamento | Gramas/unidade |
| --- | ---: |
| Caixa de som (mini portátil) | 250 |
| Liquidificador (plástico simples) | 750 |
| Notebook (ultrabook / leve) | 1000 |
| Monitor (LED ultrafino) | 1500 |
| Rádio (pequeno) | 250 |
| Impressora (jato de tinta compacta) | 2000 |
| Modem / Roteador | 250 |
| Estabilizador (linha leve) | 1250 |
| Mouse (quando cadastrado) | 120 |

A carga inicial cria os oito oficiais, não cria Mouse e preserva o Mouse existente. Conflito de nome/peso interrompe a carga. As migrações de exclusividade verificam conflitos antes de criar proteções; exigem resolução administrativa explícita em ambientes que já possuam combinações inválidas.

Há somente um ADMIN ativo no ambiente original auditado; não desative ou remova o próprio último acesso técnico durante a apresentação. Não há bloqueio automático do último ADMIN.

## Restrição institucional (26/11/2026)

Acesso exige domínio exato configurado em ALLOWED_EMAIL_DOMAINS; padrões: alunos.ifsuldeminas.edu.br e ifsuldeminas.edu.br. A validação cobre cadastro/login tradicional, Google/vínculo, cadastro técnico, atualização de e-mail e todas as sessões protegidas. Conta externa anterior não é apagada, mas o JWT é recusado. Nenhum perfil contorna a política. No Google, tanto identidade verificada quanto conta persistida devem ser permitidas; não se confia em domínio declarado pelo navegador ou apenas no claim hd.

ALLOW_LOCAL_TEST_EMAILS=false por padrão. ecotroca.test só funciona mediante true em NODE_ENV=development, com banco e frontend loopback; nunca em produção, mesmo inserido na lista comum. A política efetiva é publicada no endpoint Google de configuração (emailPolicyOnly=true não modifica nonce), para feedback dos formulários sem duplicar configuração. ADMIN_EMAIL define o endereço institucional dos scripts locais. Consulte o README para instalação e provisionamento, sem alteração automática de contas ou históricos.
