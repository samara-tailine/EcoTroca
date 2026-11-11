BEGIN;

-- AlterTable
ALTER TABLE "EcoCoinMovement" ADD COLUMN     "redemptionKey" UUID,
ADD COLUMN     "redemptionValueBrl" DECIMAL(14,2);

-- CreateIndex
CREATE UNIQUE INDEX "EcoCoinMovement_redemptionKey_key" ON "EcoCoinMovement"("redemptionKey");

-- Créditos e débitos legados permanecem intactos; somente resgates usam os novos campos.
ALTER TABLE "EcoCoinMovement" ADD CONSTRAINT "EcoCoinMovement_redemption_shape_check" CHECK (
  ("redemptionKey" IS NULL AND "redemptionValueBrl" IS NULL)
  OR (
    "redemptionKey" IS NOT NULL AND "redemptionValueBrl" IS NOT NULL
    AND "type" = 'DEBIT' AND "disposalRequestId" IS NULL AND "createdByUserId" IS NOT NULL
    AND "coinValueBrlSnapshot" IS NOT DISTINCT FROM 0.10::numeric
    AND "redemptionValueBrl" > 0
    AND "redemptionValueBrl" = "amount" * 0.10::numeric
  )
);

CREATE FUNCTION ecotroca_validate_xerox_redemption() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  wallet "EcoCoinWallet"%ROWTYPE;
BEGIN
  IF NEW.type <> 'DEBIT' THEN RETURN NEW; END IF;
  SELECT * INTO wallet FROM "EcoCoinWallet" WHERE id = NEW."walletId" FOR UPDATE;
  IF wallet.id IS NULL OR NEW."redemptionKey" IS NULL OR NEW."redemptionValueBrl" IS NULL
    OR NEW."disposalRequestId" IS NOT NULL OR NEW."createdByUserId" IS NULL
    OR NEW."coinValueBrlSnapshot" IS DISTINCT FROM 0.10::numeric
    OR NEW."redemptionValueBrl" IS DISTINCT FROM (NEW.amount * 0.10::numeric)
    OR NEW."redemptionValueBrl" <= 0 OR NEW.amount <= 0
    OR NEW."balanceAfter" IS DISTINCT FROM wallet.balance OR wallet.balance < 0
    OR NOT EXISTS (
      SELECT 1 FROM "User" u JOIN "UserAccessProfile" a ON a."userId" = u.id
      JOIN "AccessProfile" p ON p.id = a."accessProfileId"
      WHERE u.id = wallet."userId" AND u."isActive" AND p.key = 'STUDENT' AND p."isActive"
    ) OR NOT EXISTS (
      SELECT 1 FROM "User" u JOIN "UserAccessProfile" a ON a."userId" = u.id
      JOIN "AccessProfile" p ON p.id = a."accessProfileId"
      WHERE u.id = NEW."createdByUserId" AND u."isActive" AND p.key = 'XEROX' AND p."isActive"
    ) OR EXISTS (
      SELECT 1 FROM "UserAccessProfile" a JOIN "AccessProfile" p ON p.id = a."accessProfileId"
      WHERE a."userId" = NEW."createdByUserId" AND p.key IN ('ADMIN', 'LIBRARY') AND p."isActive"
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'EcoCoinMovement_xerox_redemption_authorization',
      MESSAGE = 'Resgate inválido: verifique operador da Xerox, estudante ativo, saldo, idempotência e conversão exata em centavos.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "EcoCoinMovement_xerox_redemption_authorization"
BEFORE INSERT ON "EcoCoinMovement"
FOR EACH ROW EXECUTE FUNCTION ecotroca_validate_xerox_redemption();

-- Mantém a identidade do estudante ligada permanentemente ao histórico da carteira.
CREATE FUNCTION ecotroca_keep_wallet_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."userId" IS DISTINCT FROM OLD."userId" THEN
    RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'EcoCoinWallet_owner_immutable',
      MESSAGE = 'O proprietário da carteira de EcoCoins não pode ser alterado.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "EcoCoinWallet_owner_immutable"
BEFORE UPDATE ON "EcoCoinWallet"
FOR EACH ROW EXECUTE FUNCTION ecotroca_keep_wallet_owner();

COMMIT;