# Entrega final atualizada — 26/11/2026

## Alteração final

Acesso restrito a e-mails institucionais exatos, configurável por ALLOWED_EMAIL_DOMAINS. Aplicado no cadastro/login tradicional, Google/vínculo, cadastro técnico, alteração de e-mail e sessões existentes. Mensagem e feedback em pt-BR; sem mudança de design. Detalhes e arquivos de política em [acesso-institucional.md](acesso-institucional.md).

Exceção ecotroca.test desabilitada por padrão, exclusiva de desenvolvimento com banco/frontend locais; produção nunca a aceita. ADMIN_EMAIL define o endereço institucional dos scripts administrativos. O ambiente real não foi modificado; usuários e históricos não foram migrados ou apagados. Não há nova migração: as 12 existentes continuam necessárias.

## Instalação limpa e resultados

- Nova cópia sem node_modules, dist, .env ou Prisma Client; npm.cmd ci nos dois projetos com lockfiles inalterados, sem atualização forçada.
- Novo banco ecotroca_institutional_test em cluster PostgreSQL temporário porta 55436, separado do banco original. Aplicação das 12 migrações do zero aprovada; validação/geração Prisma e carga idempotente dos oito equipamentos aprovadas.
- Builds backend e frontend aprovados; frontend com 220 módulos.
- 170 asserções de regressão HTTP e banco: provisionamento institucional ADMIN idempotente sem redefinição, quatro perfis, cadastro público somente STUDENT, pesos bloqueados na API e PostgreSQL, quantidades conferidas 10/7/12 para declaração 10 gerando 100/70/120 EcoCoins, aprovação incompleta/duplicada bloqueada, isolamento de solicitações e créditos, pagamento de 1,25 EcoCoin concorrente com mesma chave gerando um único débito e R$ 0,125, recebimentos Xerox sem expor saldo, inativação e rota de débito antiga indisponível.
- 125 asserções institucionais/Google/frontend aprovadas, incluindo bloqueio de sessões antigas e demonstração em produção. Total: 295 asserções.
- Nenhum teste modificou o banco original. Instância temporária desligada após a validação. Também foi verificada a inicialização da API restrita a 127.0.0.1 quando a exceção local está habilitada.

## Segurança e pacote

Varredura heurística de 237 versões textuais acessíveis no histórico local sem correspondências para segredos locais atuais, .env real histórico, chave privada ou padrões reconhecíveis de tokens. Não certifica referências remotas/inacessíveis, reflogs ou todos os formatos possíveis. Nenhum valor sensível foi exibido.

ZIP montado pelos arquivos atuais, incluindo arquivos novos não versionados (lista em arquivos-nao-versionados.txt), sem depender de git archive HEAD. Conteúdo conferido por SHA-256. Não inclui .env reais, .git, node_modules, dist, caches, logs, backups, dumps, chaves ou configurações pessoais. Sem commit, push ou publicação. O ZIP anterior só foi substituído após a validação do novo pacote.

## Limitações e providências

O ambiente original possui somente contas externas/teste na consulta desta preparação (quatro ecotroca.test e três gmail.com). Elas permanecem intactas. Após reiniciar com a nova versão, defaults bloqueiam todas: configure um ADMIN institucional novo ou, somente para demonstração local, habilite explicitamente a exceção ecotroca.test conforme README. gmail.com continua bloqueado. Nenhuma credencial institucional real foi solicitada ou inventada.

Google foi validado com assinatura RSA real e chaves públicas temporárias simuladas; login com conta Google real depende de Client ID, origens, público, políticas Workspace e endereço institucional. Não houve novo ensaio visual de navegador dos quatro painéis.

Alertas npm conhecidos permanecem sem atualização: instalação anterior reportou backend 18 (2 baixos, 11 moderados, 5 altos) e frontend 9 moderados incluindo desenvolvimento; auditoria de produção anterior encontrou zero no frontend e três altos na cadeia Prisma/config/effect. Nesta reinstalação usou-se --no-audit para evitar consultas repetidas; lockfiles não mudaram. Não foi demonstrada exploração pela API. @scarf/scarf continuou sem script de telemetria aprovado, sem impedir a instalação ou o funcionamento.

Limites anteriores preservados: sem recuperação de senha, limitação de tentativas, proteção do último ADMIN, upload, estornos ou ajustes manuais. Nomes de categorias têm pré-checagem sem distinção de caixa, mas índice único não normaliza caixa em concorrência. Produção pública requer revisão adicional de segurança/hosting; entrega acadêmica local foi reproduzida em ambiente isolado.
