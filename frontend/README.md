# EcoTroca — Frontend

React + TypeScript, Vite, React Router, Axios e Tailwind CSS.

## Desenvolvimento local

1. Inicie o backend em outro terminal: `cd ../backend` e `npm.cmd run start:dev`.
2. No diretório `frontend`, execute `npm.cmd run dev`.
3. Abra `http://localhost:5173`. Sem sessão, a aplicação redireciona para `/login`.
4. Entre com uma conta existente e ativa. ADMIN é encaminhado para `/admin/categories`; os demais perfis veem os dados da conta.
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
- Equipamentos: escolha uma categoria ativa, informe nome e peso médio inteiro em gramas (1 a 1.000.000), salve e confira a listagem. Edite apenas pesos não oficiais e alterne o status.
- Os filtros permitem consultar registros ativos e inativos. A categoria atual inativa de um equipamento pode ser mantida durante a edição, mas novas associações usam categorias ativas.
- Confira as mensagens de sucesso e tente repetir um nome para verificar o tratamento de conflito. Desativar preserva registros e vínculos.
- Reduza a janela para conferir o menu móvel. Entre com STUDENT e tente acessar `/admin/categories` diretamente: será exibido acesso restrito. Sem sessão, o destino é `/login`.

São utilizados apenas os GET/POST/PATCH existentes de `/api/categories`, `/api/equipment` e suas rotas `/:id` e `/:id/status`. As requisições enviam Bearer JWT; o backend também exige ADMIN. Não há exclusão de registros.

## Identidade visual

As cores estão centralizadas em `src/styles/index.css`, com tokens CSS e aliases do Tailwind: azul `#287CA5`, verde `#75B953`, azul escuro `#214F6B`, fundo `#F5F7EF` e branco `#FFFFFF`. Login, conta e administração compartilham os mesmos tokens.

A logo original `public/imagens/logo_ecotroca.jpeg` é utilizada por padrão no login, na conta e na administração. O componente Brand exibe o arquivo completo, sem filtros, recortes ou alteração de proporções e cores. `VITE_LOGO_URL` é opcional e permite indicar outro arquivo oficial. Reinicie o Vite após alterar essa variável.

## Perfis definitivos e pesos oficiais

A área atual é de manutenção técnica, reservada ao perfil interno ADMIN (Administrador técnico). Administrador da Biblioteca (LIBRARY) e Administrador da Xerox (XEROX) são perfis operacionais distintos, sem acesso implícito à manutenção. Consulte docs/access-control.md na raiz do projeto para a matriz atual e as decisões pendentes.

Os oito pesos da tabela oficial são fixos na API e no PostgreSQL, inclusive após renomeações. O formulário apresenta esses pesos apenas para leitura e omite o campo na atualização. Os registros não oficiais mantêm as permissões atuais até nova definição.
