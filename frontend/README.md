# EcoTroca — Frontend

React + TypeScript, Vite, React Router, Axios e Tailwind CSS.

## Desenvolvimento local

1. Inicie o backend em outro terminal: `cd ../backend` e `npm.cmd run start:dev`.
2. No diretório `frontend`, execute `npm.cmd run dev`.
3. Abra `http://localhost:5173`. Sem sessão, a aplicação redireciona para `/login`.
4. Entre com uma conta existente e ativa. STUDENT é encaminhado para `/student`; ADMIN mantém `/admin/categories`; LIBRARY elegível abre `/library/disposals`; os demais perfis veem os dados da conta.
5. Recarregue a página para verificar a manutenção da sessão na aba. Clique em **Sair** e tente abrir `/` novamente: o login será solicitado.
6. Uma senha incorreta apresenta uma mensagem de erro sem iniciar sessão. As listagens e operações futuras da API usam o JWT automaticamente.

O Vite encaminha `/api` para `http://localhost:3000`, incluindo `POST /api/auth/login`. Para usar outra API, configure `VITE_API_URL` em `.env` (exemplo em `.env.example`); inclua o prefixo `/api`. Reinicie o Vite após alterar essa variável.

## Sessão

O JWT e apenas os dados de identificação retornados pelo login ficam em `sessionStorage`, por aba. Senhas não são persistidas. A sessão expira conforme o JWT ou `expiresIn`, e respostas 401 em chamadas autenticadas encerram a sessão. Não há renovação automática de tokens.

Os perfis exibidos são os recebidos no login; não há seleção de perfil. Os guards do backend continuam responsáveis por validar a assinatura JWT, o usuário ativo e as permissões em cada requisição. A proteção do React controla a navegação, sem substituir essa autorização.

## Build

Execute `npm.cmd run build` para compilar TypeScript e gerar `dist/`. O preview do Vite não possui o proxy de desenvolvimento: ao usá-lo, configure uma API acessível por `VITE_API_URL` com CORS adequado, ou sirva o frontend e `/api` na mesma origem.
## Administração do catálogo

As páginas `/admin/categories` e `/admin/equipment` exigem sessão com perfil ADMIN. O menu **Dados da conta** retorna à página inicial; nela, administradores também podem usar **Abrir administração**.

- Categorias: crie uma categoria, busque pelo nome, edite a descrição e alterne entre ativa/inativa.
- Equipamentos: escolha uma categoria ativa, informe nome e peso médio inteiro em gramas (1 a 1.000.000), salve e confira a listagem. Confira o peso fixo, edite os demais dados e alterne o status.
- Os filtros permitem consultar registros ativos e inativos. A categoria atual inativa de um equipamento pode ser mantida durante a edição, mas novas associações usam categorias ativas.
- Confira as mensagens de sucesso e tente repetir um nome para verificar o tratamento de conflito. Desativar preserva registros e vínculos.
- Reduza a janela para conferir o menu móvel. Entre com STUDENT e tente acessar `/admin/categories` diretamente: será exibido acesso restrito. Sem sessão, o destino é `/login`.

São utilizados apenas os GET/POST/PATCH existentes de `/api/categories`, `/api/equipment` e suas rotas `/:id` e `/:id/status`. As requisições enviam Bearer JWT; o backend também exige ADMIN. Não há exclusão de registros.

## Identidade visual

As cores estão centralizadas em `src/styles/index.css`, com tokens CSS e aliases do Tailwind: azul `#287CA5`, verde `#75B953`, azul escuro `#214F6B`, fundo `#F5F7EF` e branco `#FFFFFF`. Login, conta e administração compartilham os mesmos tokens.

A logo original `public/imagens/logo_ecotroca.jpeg` é utilizada por padrão no login, na conta e na administração. O componente Brand exibe o arquivo completo, sem filtros, recortes ou alteração de proporções e cores. `VITE_LOGO_URL` é opcional e permite indicar outro arquivo oficial. Reinicie o Vite após alterar essa variável.

## Perfis definitivos e pesos fixos

A área atual é de manutenção técnica, reservada ao perfil interno ADMIN (Administrador técnico). Administrador da Biblioteca (LIBRARY) e Administrador da Xerox (XEROX) são perfis operacionais distintos, sem acesso implícito à manutenção. Consulte docs/access-control.md na raiz do projeto para a matriz de permissões e as regras definitivas.

Todos os pesos são fixos na API e no PostgreSQL, incluindo o Mouse (120 g) e outros itens não oficiais, mesmo após renomeações. O formulário apresenta os pesos de equipamentos existentes apenas para leitura e omite o campo na atualização. O peso inicial de novos equipamentos é definido no cadastro pelo administrador técnico e não pode ser alterado depois. Contas com ADMIN não podem acumular LIBRARY nem XEROX, tanto no cadastro quanto na substituição de perfis.

## Painel do estudante

| Página | Caminho |
| --- | --- |
| Visão geral | /student |
| Nova solicitação de descarte | /student/disposals/new |
| Histórico de solicitações | /student/disposals |
| Detalhes, conferência e histórico do descarte | /student/disposals/:id |
| Saldo, créditos e resgates | /student/ecocoins |

Todas ficam dentro da autenticação existente e do guard de perfil STUDENT. Dados da conta e logout continuam disponíveis. Não há seleção de perfil no login. O login de estudante abre o painel; contas que também possuem ADMIN mantêm o destino técnico anterior e podem usar o link para seu painel de estudante na conta.

O layout usa a logo original, as cores centralizadas e os padrões já existentes de menu lateral/cabeçalho, com menu móvel e estados de carregamento, erro, vazio e sucesso.

### Integrações existentes

- GET /api/equipment/active para o catálogo do formulário.
- POST /api/disposals para enviar equipamentos distintos, quantidades, condição física, funcionamento e URL opcional da foto.
- GET /api/disposals para solicitações e contagens por status, com paginação e filtros.
- GET /api/disposals/:id para detalhe, parecer, divergências e histórico.
- GET /api/ecocoins/wallet e GET /api/ecocoins/movements para saldo e histórico próprios.

O Axios existente envia o JWT e encerra a sessão em respostas 401. As consultas são canceladas quando a página muda; as telas permitem atualizar os dados. O painel não envia créditos, resgates, aprovações ou alterações de pesos.

A API existente dá visão ampliada de solicitações a contas que também possuem LIBRARY. Nessa combinação, o cliente pagina a coleção autorizada e seleciona apenas os registros do estudante para apresentar a visão pessoal. O detalhe também confere o proprietário antes de exibir os dados. A autorização real continua no backend, sem mudança de rotas ou permissões.

### Valores e formulário

Os valores monetários permanecem strings decimais. A apresentação usa BigInt para evitar arredondamento por ponto flutuante. O equivalente em reais utiliza a referência retornada pela API e pode exibir uma fração de centavo: 10,01 EcoCoins equivalem exatamente a R$ 1,001. O valor resgatável em centavos é mostrado separadamente, respeitando os múltiplos de 0,10 EcoCoin já definidos no backend, sem remover os centésimos restantes da carteira.

O formulário permite até 100 tipos de equipamento, sem duplicar um equipamento na mesma solicitação. A quantidade, as opções padronizadas e o limite de peso seguem a API. Os pesos aparecem apenas para leitura e o total exibido é uma conferência local; o backend continua responsável por calcular e guardar os snapshots.

Fotos são referências HTTP/HTTPS opcionais. O detalhe abre os links em outra aba com proteção de referência, sem buscar imagens externas automaticamente nem implementar upload. Os dados declarados ficam separados das divergências da Biblioteca.

O botão de envio impede cliques repetidos enquanto a solicitação está em andamento. Não há repetição automática do POST. Se a rede não confirmar o resultado, a mensagem orienta consultar Meus descartes antes de tentar novamente, já que esse endpoint existente não possui chave de idempotência.

### Conferência manual no navegador

1. Inicie o backend e rode npm.cmd run dev neste diretório. Abra http://localhost:5173 com uma conta ativa STUDENT.
2. Confira a visão geral e Meus EcoCoins. Saldo zero e listas vazias são estados válidos antes de novas operações.
3. Em Nova solicitação, adicione dois equipamentos diferentes, preencha quantidade e as opções de estado/funcionamento e envie. A foto é opcional.
4. Confira a confirmação, os dados originais, o peso e a linha do tempo no detalhe. Use o filtro de status e a paginação em Meus descartes.
5. Após o processamento pelas APIs operacionais existentes, clique em Atualizar para conferir aprovação, crédito e eventual resgate no histórico pessoal.
6. Confira o menu em uma janela estreita, saia e tente abrir /student diretamente. O login será solicitado. Contas sem STUDENT veem acesso restrito.

Validação realizada: npm run build e oito verificações pontuais de precisão monetária/segurança de URLs. Não houve testes complexos ou automação de navegador. Nenhum arquivo ou endpoint do backend foi alterado nesta etapa.
## Painel da Biblioteca

| Página | Caminho |
| --- | --- |
| Fila de solicitações | /library/disposals |
| Detalhes e processamento | /library/disposals/:id |
| Histórico de créditos relacionados ao processamento | /library/credits |

`/library` redireciona para a fila. Todas as páginas ficam sob JWT e LibraryRoute: é necessário LIBRARY e não possuir ADMIN nem XEROX entre os perfis da sessão, em conformidade com o backend. O backend permanece responsável por conferir as permissões reais em cada chamada.

O login de uma conta apenas LIBRARY abre a fila. As prioridades anteriores de ADMIN e STUDENT são preservadas, incluindo contas STUDENT/LIBRARY que continuam abrindo o painel do estudante. A página Dados da conta oferece o link da Biblioteca aos usuários elegíveis, sem seletor de perfil. Logout e sessão continuam compartilhados.

### APIs utilizadas

- GET /api/disposals com status opcional, página e 10 registros por página.
- GET /api/disposals/:id para os dados do estudante, declarações originais, pesos históricos, divergências, parecer e linha do tempo.
- PATCH /api/disposals/:id/receive com observações opcionais.
- PATCH /api/disposals/:id/check com observações e divergências opcionais por item.
- PATCH /api/disposals/:id/approve e /reject com justificativa obrigatória.
- GET /api/ecocoins/credits com paginação e filtro opcional por disposalRequestId.

A conferência permite marcar cada equipamento com divergência, informar descrição obrigatória e, opcionalmente, quantidade observada (inclusive zero), condição física e funcionamento padronizados. Apenas campos de observação são enviados; as declarações originais e os pesos não são editados.

As ações exibem e respeitam a sequência Pendente → Recebida → Em análise → Aprovada. Rejeitar continua disponível nos três estados abertos, com justificativa. Recebimento/conferência não podem ser repetidos; estados terminais não oferecem novas operações. A aprovação exige as datas de recebimento/conferência, peso histórico disponível e outro usuário como solicitante. Todas essas validações continuam sujeitas à decisão final do backend.

O botão Confirmar aprovação e crédito chama somente a aprovação existente; o crédito ocorre na transação do backend. Não há concessão manual nem cálculo de crédito no cliente. O link Ver créditos vinculados abre o histórico com o filtro da solicitação. A API restringe os créditos aos descartes em que o usuário participou do recebimento, conferência ou aprovação, sem revelar o saldo total do estudante.

Durante o envio, as ações e o formulário são desabilitados e uma trava local evita duplo clique. Após sucesso, o detalhe e a linha do tempo são recarregados. Erros 409 e respostas incertas não causam repetição automática do PATCH: a interface mostra a mensagem em pt-BR e atualiza os dados para conferir o resultado. Formulários pedem confirmação explícita pela ação e justificativa quando exigida.

Os componentes DisposalItems, DisposalReview e DisposalTimeline foram extraídos para components/disposals/DisposalReadOnly.tsx e compartilhados com o detalhe STUDENT, preservando a apresentação do painel existente. Também são reutilizados Brand, estilos, tokens, paginação, badges de status, mensagens, formatação e o cliente Axios com JWT.

### Roteiro manual

1. Inicie backend e frontend conforme as instruções locais. Entre com LIBRARY ativo, sem ADMIN ou XEROX.
2. Abra a fila, filtre os status e confira paginação, estudante, peso e detalhe.
3. Em uma solicitação pendente, abra Registrar recebimento e confirme; depois abra Registrar conferência.
4. Marque um item com divergência, informe sua descrição e valores observados e conclua. Confira que os dados originais continuam separados dos observados.
5. A aprovação pede justificativa e identifica que também registra o crédito. Uma solicitação própria deve manter a aprovação bloqueada. Solicitações abertas também podem ser rejeitadas com justificativa antes do recebimento.
6. Confira o novo evento na linha do tempo e o crédito pela página de créditos vinculados. Depois de concluída, a solicitação não permite repetir operações.
7. Confira o menu em tela estreita, logout, acesso negado com outro perfil e o funcionamento anterior de STUDENT.

O build passou e 21 verificações pontuais das regras de perfil/sequência passaram. Não houve testes complexos, alterações em dados reais ou automação de navegador. Nenhum arquivo do backend, endpoint, peso ou conversão foi alterado. O painel XEROX não foi implementado nesta etapa.