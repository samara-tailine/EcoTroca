BEGIN;
-- Colunas novas permanecem NULL nos registros existentes. Nenhum histórico é recalculado.
ALTER TABLE "DisposalItem" ADD COLUMN "quantityObserved" INTEGER;
ALTER TABLE "DisposalRequest" ADD COLUMN "totalWeightGramsObserved" INTEGER;
ALTER TABLE "DisposalItem" ADD CONSTRAINT "DisposalItem_observed_quantity_check" CHECK ("quantityObserved" IS NULL OR "quantityObserved">=0);
ALTER TABLE "DisposalRequest" ADD CONSTRAINT "DisposalRequest_observed_weight_check" CHECK ("totalWeightGramsObserved" IS NULL OR "totalWeightGramsObserved">=0);

CREATE FUNCTION ecotroca_guard_checked_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE request "DisposalRequest"%ROWTYPE;
BEGIN
  SELECT * INTO request FROM "DisposalRequest" WHERE id=OLD."disposalRequestId" FOR UPDATE;
  IF request.status='APPROVED' THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Os itens de um descarte aprovado são históricos e não podem ser alterados.';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF ROW(NEW.quantity,NEW."averageWeightGramsSnapshot",NEW."equipmentNameSnapshot",NEW."equipmentId",NEW."disposalRequestId",NEW."physicalCondition",NEW.functionality,NEW."photoUrl")
    IS DISTINCT FROM ROW(OLD.quantity,OLD."averageWeightGramsSnapshot",OLD."equipmentNameSnapshot",OLD."equipmentId",OLD."disposalRequestId",OLD."physicalCondition",OLD.functionality,OLD."photoUrl") THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Os dados declarados e os snapshots originais devem ser preservados.';
  END IF;
  IF NEW."quantityObserved" IS DISTINCT FROM OLD."quantityObserved" AND
    (request.status NOT IN ('RECEIVED','IN_REVIEW') OR (request."checkedAt" IS NOT NULL AND request."totalWeightGramsObserved" IS NOT NULL)) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='A quantidade conferida só pode ser registrada antes de concluir a conferência.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "DisposalItem_checked_history_guard" BEFORE UPDATE OR DELETE ON "DisposalItem"
FOR EACH ROW EXECUTE FUNCTION ecotroca_guard_checked_item();

CREATE FUNCTION ecotroca_guard_observed_approval() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE grams numeric; missing integer; item_count integer;
BEGIN
  IF OLD.status='APPROVED' THEN
    IF ROW(NEW.status,NEW."totalWeightGramsObserved",NEW."totalWeightGramsSnapshot",NEW."conversionRateCoinsPerKgSnapshot",NEW."requesterId",NEW."reviewedById",NEW."approvedAt",NEW."checkedAt",NEW."receivedAt")
      IS DISTINCT FROM ROW(OLD.status,OLD."totalWeightGramsObserved",OLD."totalWeightGramsSnapshot",OLD."conversionRateCoinsPerKgSnapshot",OLD."requesterId",OLD."reviewedById",OLD."approvedAt",OLD."checkedAt",OLD."receivedAt") THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='A aprovação e os valores históricos não podem ser alterados.';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status='APPROVED' THEN
    SELECT count(*),count(*) FILTER(WHERE "quantityObserved" IS NULL),sum("quantityObserved"::numeric*"averageWeightGramsSnapshot"::numeric)
      INTO item_count,missing,grams FROM "DisposalItem" WHERE "disposalRequestId"=NEW.id;
    IF item_count=0 OR missing>0 OR grams IS NULL OR grams<=0 OR grams>2147483647
      OR NEW."checkedAt" IS NULL OR NEW."receivedAt" IS NULL
      OR NEW."totalWeightGramsObserved" IS DISTINCT FROM grams THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='A aprovação exige conferência completa e peso positivo calculado pelas quantidades observadas.';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "DisposalRequest_observed_approval_guard" BEFORE UPDATE ON "DisposalRequest"
FOR EACH ROW EXECUTE FUNCTION ecotroca_guard_observed_approval();

CREATE OR REPLACE FUNCTION ecotroca_validate_disposal_credit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  request "DisposalRequest"%ROWTYPE;
  wallet "EcoCoinWallet"%ROWTYPE;
  grams numeric;
BEGIN
  IF NEW."disposalRequestId" IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO request FROM "DisposalRequest" WHERE id = NEW."disposalRequestId" FOR UPDATE;
  SELECT * INTO wallet FROM "EcoCoinWallet" WHERE id = NEW."walletId" FOR UPDATE;
  SELECT SUM(i."quantityObserved"::numeric * i."averageWeightGramsSnapshot"::numeric) INTO grams
    FROM "DisposalItem" i WHERE i."disposalRequestId" = request.id;
  IF EXISTS(SELECT 1 FROM "DisposalItem" WHERE "disposalRequestId"=request.id AND "quantityObserved" IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='O crédito exige quantidade conferida para todos os itens.';
  END IF;
  IF NEW.type <> 'CREDIT' OR request.id IS NULL OR wallet.id IS NULL
    OR request.status <> 'APPROVED' OR request."approvedAt" IS NULL
    OR request."receivedAt" IS NULL OR request."checkedAt" IS NULL
    OR request."reviewedById" IS DISTINCT FROM NEW."createdByUserId"
    OR NEW."createdByUserId" IS NULL OR request."requesterId" = NEW."createdByUserId"
    OR wallet."userId" IS DISTINCT FROM request."requesterId"
    OR request."conversionRateCoinsPerKgSnapshot" IS DISTINCT FROM 10::numeric
    OR request."totalWeightGramsObserved" IS NULL OR request."totalWeightGramsObserved" <= 0
    OR grams IS DISTINCT FROM request."totalWeightGramsObserved"::numeric
    OR NEW.amount IS DISTINCT FROM (request."totalWeightGramsObserved"::numeric * 10 / 1000)
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
COMMIT;
