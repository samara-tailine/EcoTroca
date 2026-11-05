BEGIN;

ALTER TABLE "Equipment" ADD COLUMN "officialCatalogKey" VARCHAR(50);

-- Mantém os IDs, associações, status e históricos existentes. A unicidade
-- interrompe a migração se houver correspondências ambíguas, sem excluir contas ou equipamentos.
WITH official (key, weight, names) AS (
  VALUES
    ('MINI_SPEAKER', 250, ARRAY['Caixa de som (mini portátil)', 'Caixa de som']),
    ('BLENDER', 750, ARRAY['Liquidificador (plástico simples)', 'Liquidificador']),
    ('LIGHT_NOTEBOOK', 1000, ARRAY['Notebook (ultrabook / leve)', 'Notebook']),
    ('LED_MONITOR', 1500, ARRAY['Monitor (LED ultrafino)', 'Monitor']),
    ('SMALL_RADIO', 250, ARRAY['Rádio (pequeno)', 'Rádio']),
    ('INKJET_PRINTER', 2000, ARRAY['Impressora (jato de tinta compacta)', 'Impressora']),
    ('MODEM_ROUTER', 250, ARRAY['Modem / Roteador', 'Modem', 'Roteador']),
    ('LIGHT_STABILIZER', 1250, ARRAY['Estabilizador (linha leve)', 'Estabilizador'])
)
UPDATE "Equipment" AS e
SET "officialCatalogKey" = official.key, "averageWeightGrams" = official.weight
FROM official
WHERE EXISTS (SELECT 1 FROM unnest(official.names) AS alias(name) WHERE lower(btrim(e."name")) = lower(alias.name));

CREATE UNIQUE INDEX "Equipment_officialCatalogKey_key" ON "Equipment"("officialCatalogKey");

ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_official_weight_check" CHECK (
  "officialCatalogKey" IS NULL OR
  CASE "officialCatalogKey"
    WHEN 'MINI_SPEAKER' THEN "averageWeightGrams" = 250
    WHEN 'BLENDER' THEN "averageWeightGrams" = 750
    WHEN 'LIGHT_NOTEBOOK' THEN "averageWeightGrams" = 1000
    WHEN 'LED_MONITOR' THEN "averageWeightGrams" = 1500
    WHEN 'SMALL_RADIO' THEN "averageWeightGrams" = 250
    WHEN 'INKJET_PRINTER' THEN "averageWeightGrams" = 2000
    WHEN 'MODEM_ROUTER' THEN "averageWeightGrams" = 250
    WHEN 'LIGHT_STABILIZER' THEN "averageWeightGrams" = 1250
    ELSE false
  END
);

UPDATE "AccessProfile" SET
  "name" = CASE "key"
    WHEN 'STUDENT' THEN 'Estudante'
    WHEN 'LIBRARY' THEN 'Administrador da Biblioteca'
    WHEN 'XEROX' THEN 'Administrador da Xerox'
    WHEN 'ADMIN' THEN 'Administrador técnico' END,
  "description" = CASE "key"
    WHEN 'STUDENT' THEN 'Solicita descartes, acompanha suas solicitações e utiliza seus EcoCoins.'
    WHEN 'LIBRARY' THEN 'Recebe e confere equipamentos, aprova descartes e concede EcoCoins aos estudantes.'
    WHEN 'XEROX' THEN 'Recebe EcoCoins em resgates e debita o saldo dos estudantes.'
    WHEN 'ADMIN' THEN 'Perfil técnico reservado à manutenção do sistema, sem herdar permissões operacionais da Biblioteca ou da Xerox.' END
WHERE "key" IN ('STUDENT', 'LIBRARY', 'XEROX', 'ADMIN');

COMMIT;