# Entrega acadêmica autossuficiente — 26/11/2026

## Roteiro do professor

O README principal inicia com o roteiro de avaliação: instalar Node/PostgreSQL, criar banco UTF8 vazio e usuário local, npm.cmd ci em backend/frontend, copiar os exemplos para .env locais e configurar DATABASE_URL/JWT_SECRET próprios. Habilitar explicitamente NODE_ENV=development e ALLOW_LOCAL_TEST_EMAILS=true, com banco/frontend loopback. Aplicar as 12 migrações, gerar Prisma, compilar e executar node scripts/seed-demo.mjs antes de iniciar a API. Abrir o frontend e usar as quatro credenciais fictícias publicadas no README.

O ZIP dispensa o banco original, Google, senhas pessoais ou dumps. npm ci exige acesso ao registro npm e Node/PostgreSQL devem estar instalados. O seed não roda automaticamente na inicialização. Em produção, não execute o roteiro acadêmico: mantenha exceção false e provisione ADMIN institucional com ADMIN_EMAIL, conforme seção específica do README.

## Alterações desta etapa

- Novo backend/scripts/seed-demo.mjs: quatro perfis e contas de demonstração, categorias e oito equipamentos oficiais. Guarda de ambiente antes da conexão; transação única e trava consultiva contra execuções simultâneas.
- Senhas públicas distintas, fictícias e exclusivas de demonstração no README; Argon2id no banco. Contas/equipamentos/categorias/perfis existentes nunca são sobrescritos pelo seed. Registros ambíguos/pesos incompatíveis interrompem a transação. Carteira STUDENT é criada pelo trigger, sem saldo fictício.
- README e documentos de backend/acesso institucional atualizados. Design, regras financeiras, permissões, restrição institucional e dependências não foram alterados. Nenhuma migração nova foi necessária. Sem push ou publicação.

## Instalação limpa validada

- Nova cópia sem ambientes reais, node_modules, dist ou cliente Prisma gerado; npm.cmd ci nos dois projetos com lockfiles inalterados.
- PostgreSQL temporário UTF8 em 127.0.0.1:55436, banco ecotroca_demo_delivery_test inicialmente vazio. Nenhum comando de seed/migração/teste escreveu no banco original.
- Prisma validate/generate aprovados, 12 migrações aplicadas do zero; builds backend e frontend aprovados (220 módulos no frontend).
- Seed executado antes de iniciar a API: quatro contas com perfis ADMIN/LIBRARY/XEROX/STUDENT exclusivos, oito equipamentos, categorias e uma carteira STUDENT zerada; sem movimentações ou descartes fictícios.
- Segunda execução produziu snapshot idêntico dos dados: usuários, hashes/senhas, perfis, associações, categorias, equipamentos e carteira preservados. Repetição após descarte/crédito/pagamento também preservou integralmente saldos e históricos.
- 123 verificações de API/seed/banco aprovadas e 8 verificações de navegador aprovadas. Os quatro e-mails/senhas exatos do README autenticaram na API e no frontend real, com redirecionamento para o painel correspondente e confirmação de permissões.
- Testes positivos/negativos dos quatro perfis: ADMIN gerencia usuários/catalogo mas não processa descartes; LIBRARY recebe/confere/aprova e consulta créditos mas não gerencia usuários nem recebe pagamentos; XEROX consulta recebimentos sem carteira de terceiros; STUDENT consulta apenas sua área e não acessa gestão técnica.
- Fluxo real no banco isolado: estudante declarou duas unidades de notebook de 1 kg; Biblioteca conferiu uma, aprovou e creditou 10,00 EcoCoins. Pagamento simultâneo de 1,25 EcoCoin com mesma chave retornou um só comprovante/débito, equivalente exato R$ 0,125; Xerox consultou um recebimento. Aprovação repetida bloqueada.
- Cadastro/login com Gmail, Hotmail e domínio fraudulento recusados. Cadastro/login institucional permitido, incluindo caixa diferente. Produção recusa ecotroca.test mesmo com flag true; seed também recusa produção, flag ausente/false e banco/frontend não locais, sem alterar dados.
- API e frontend temporários foram iniciados em portas isoladas (33029 e 41729); frontend de teste apontou à API isolada por VITE_API_URL público. No roteiro padrão, Vite usa /api e proxy para localhost:3000. A instância PostgreSQL de testes foi desligada após o ensaio.

## Segurança e pacote

As quatro senhas de demonstração são públicas por decisão explícita desta entrega, não são credenciais reais e jamais devem ser reutilizadas em produção. Não há .env real, JWT_SECRET real, conexão real, dados pessoais ou backup de banco no ZIP. Google é opcional e não exige Client Secret. Hashes do conteúdo foram conferidos após compactação.

Varredura heurística de 320 versões textuais acessíveis no histórico Git não encontrou os segredos locais pesquisados, .env reais históricos ou padrões reconhecíveis de chaves/tokens. Não é certificação de referências remotas/inacessíveis ou de todo formato possível de segredo. Arquivos novos do pacote estão relacionados em arquivos-nao-versionados.txt; montagem usa o estado atual, sem depender de git archive HEAD.

O ZIP anterior só foi substituído após os testes e conferência do novo conteúdo. Excluídos .env reais, node_modules, dist, .git, caches, logs, dumps, backups, chaves e configurações pessoais. Nenhum dado da instância temporária integra a entrega.

## Limitações

Senhas/perfis do README são garantidos para contas criadas pelo seed em banco vazio. Se o e-mail já existir, o seed o preserva e avisa; não redefine senha nem ativa/promove a conta. O seed não cria Mouse automaticamente, preserva o existente e não insere créditos iniciais. É necessário executar o fluxo Biblioteca para obter EcoCoins.

Login Google real depende da configuração externa e de conta institucional; não é necessário para avaliar os quatro perfis por senha. Não houve novo teste Google real nesta etapa. Binários nativos/instalação ainda dependem de um Windows/Node compatível e acesso ao npm. Foram mantidos os alertas de dependências conhecidos, sem audit fix ou atualização forçada: na auditoria anterior, três altos da cadeia Prisma/config/effect em produção no backend, zero no frontend; desenvolvimento também possui alertas.

Não há recuperação pública de senha, limitação de tentativas, proteção do último ADMIN, upload, estorno ou ajustes manuais. O pacote é adequado à avaliação acadêmica local, não representa certificação de publicação em produção.
