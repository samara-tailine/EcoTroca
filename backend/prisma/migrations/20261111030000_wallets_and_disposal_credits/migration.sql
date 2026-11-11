BEGIN;

-- Não arredonda saldos ou históricos antigos silenciosamente.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "EcoCoinWallet" WHERE "balance" <> trunc("balance", 2))
    OR EXISTS (SELECT 1 FROM "EcoCoinMovement" WHERE "amount" <> trunc("amount", 2) OR "balanceAfter" <> trunc("balanceAfter", 2)) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Existem valores de EcoCoins com mais de duas casas decimais. A migração foi interrompida sem arredondar históricos.';
  END IF;
END $$;
-- AlterTable
ALTER TABLE "EcoCoinMovement" ADD COLUMN     "coinValueBrlSnapshot" DECIMAL(6,2),
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "balanceAfter" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "EcoCoinWallet" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(14,2);

-- Uma carteira por estudante existente, sem alterar saldos de carteiras já criadas.
INSERT INTO "EcoCoinWallet" ("id", "userId", "balance", "createdAt", "updatedAt")
SELECT gen_random_uuid(), a."userId", 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "UserAccessProfile" a JOIN "AccessProfile" p ON p.id = a."accessProfileId"
WHERE p.key = 'STUDENT'
ON CONFLICT ("userId") DO NOTHING;

CREATE FUNCTION ecotroca_create_student_wallet() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "AccessProfile" WHERE id = NEW."accessProfileId" AND key = 'STUDENT') THEN
    INSERT INTO "EcoCoinWallet" ("id", "userId", "balance", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), NEW."userId", 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("userId") DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "UserAccessProfile_create_student_wallet"
AFTER INSERT OR UPDATE ON "UserAccessProfile"
FOR EACH ROW EXECUTE FUNCTION ecotroca_create_student_wallet();

ALTER TABLE "EcoCoinMovement" ADD CONSTRAINT "EcoCoinMovement_coinValue_positive_check"
  CHECK ("coinValueBrlSnapshot" IS NULL OR "coinValueBrlSnapshot" > 0);

-- Revalida a origem e o responsável dos novos créditos de descarte também no banco.
-- Não recalcula nem concede créditos para aprovações históricas automaticamente.
CREATE FUNCTION ecotroca_validate_disposal_credit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  request "DisposalRequest"%ROWTYPE;
  wallet "EcoCoinWallet"%ROWTYPE;
  grams numeric;
BEGIN
  IF NEW."disposalRequestId" IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO request FROM "DisposalRequest" WHERE id = NEW."disposalRequestId" FOR UPDATE;
  SELECT * INTO wallet FROM "EcoCoinWallet" WHERE id = NEW."walletId" FOR UPDATE;
  SELECT SUM(i."quantity"::numeric * i."averageWeightGramsSnapshot"::numeric) INTO grams
    FROM "DisposalItem" i WHERE i."disposalRequestId" = request.id;
  IF NEW.type <> 'CREDIT' OR request.id IS NULL OR wallet.id IS NULL
    OR request.status <> 'APPROVED' OR request."approvedAt" IS NULL
    OR request."receivedAt" IS NULL OR request."checkedAt" IS NULL
    OR request."reviewedById" IS DISTINCT FROM NEW."createdByUserId"
    OR NEW."createdByUserId" IS NULL OR request."requesterId" = NEW."createdByUserId"
    OR wallet."userId" IS DISTINCT FROM request."requesterId"
    OR request."conversionRateCoinsPerKgSnapshot" IS DISTINCT FROM 10::numeric
    OR request."totalWeightGramsSnapshot" IS NULL OR request."totalWeightGramsSnapshot" <= 0
    OR grams IS DISTINCT FROM request."totalWeightGramsSnapshot"::numeric
    OR NEW.amount IS DISTINCT FROM (request."totalWeightGramsSnapshot"::numeric * 10 / 1000)
    OR NEW."balanceAfter" IS DISTINCT FROM wallet.balance
    OR NEW."coinValueBrlSnapshot" IS DISTINCT FROM 0.10::numeric
    OR NOT EXISTS (
      SELECT 1 FROM "User" u JOIN "UserAccessProfile" a ON a."userId" = u.id
      JOIN "AccessProfile" p ON p.id = a."accessProfileId"
      WHERE u.id = NEW."createdByUserId" AND u."isActive" AND p.key = 'LIBRARY' AND p."isActive"
    ) OR EXISTS (
      SELECT 1 FROM "UserAccessProfile" a JOIN "AccessProfile" p ON p.id = a."accessProfileId"
      WHERE a."userId" = NEW."createdByUserId" AND p.key IN ('ADMIN', 'XEROX') AND p."isActive"
    ) OR NOT EXISTS (
      SELECT 1 FROM "UserAccessProfile" a JOIN "AccessProfile" p ON p.id = a."accessProfileId"
      WHERE a."userId" = request."requesterId" AND p.key = 'STUDENT' AND p."isActive"
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'EcoCoinMovement_disposal_credit_authorization',
      MESSAGE = 'Crédito de descarte inválido: verifique aprovação da Biblioteca, responsável, estudante, peso e valores históricos.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "EcoCoinMovement_disposal_credit_authorization"
BEFORE INSERT ON "EcoCoinMovement"
FOR EACH ROW EXECUTE FUNCTION ecotroca_validate_disposal_credit();

CREATE FUNCTION ecotroca_keep_movement_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'EcoCoinMovement_history_immutable',
    MESSAGE = 'O histórico de EcoCoins é imutável; movimentações não podem ser editadas ou excluídas.';
END $$;
CREATE TRIGGER "EcoCoinMovement_history_immutable"
BEFORE UPDATE OR DELETE ON "EcoCoinMovement"
FOR EACH ROW EXECUTE FUNCTION ecotroca_keep_movement_history();

COMMIT;