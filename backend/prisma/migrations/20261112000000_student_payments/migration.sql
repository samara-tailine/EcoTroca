BEGIN;

CREATE TABLE "EcoCoinPayment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "idempotencyKey" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "recipientId" UUID NOT NULL,
  "studentName" VARCHAR(160) NOT NULL,
  "recipientName" VARCHAR(160) NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "valueBrl" DECIMAL(15,3) NOT NULL,
  "balanceAfter" DECIMAL(14,2) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EcoCoinPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EcoCoinPayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EcoCoinPayment_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EcoCoinPayment_values_check" CHECK (
    "studentId" <> "recipientId" AND amount > 0 AND "balanceAfter" >= 0
    AND "valueBrl" = amount * 0.10::numeric
  )
);
CREATE UNIQUE INDEX "EcoCoinPayment_idempotencyKey_key" ON "EcoCoinPayment"("idempotencyKey");
CREATE INDEX "EcoCoinPayment_studentId_createdAt_idx" ON "EcoCoinPayment"("studentId", "createdAt");
CREATE INDEX "EcoCoinPayment_recipientId_createdAt_idx" ON "EcoCoinPayment"("recipientId", "createdAt");

ALTER TABLE "EcoCoinMovement" ADD COLUMN "paymentId" UUID;
CREATE UNIQUE INDEX "EcoCoinMovement_paymentId_key" ON "EcoCoinMovement"("paymentId");
ALTER TABLE "EcoCoinMovement" ADD CONSTRAINT "EcoCoinMovement_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "EcoCoinPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EcoCoinMovement" ADD CONSTRAINT "EcoCoinMovement_payment_shape_check" CHECK (
  "paymentId" IS NULL OR (
    type = 'DEBIT' AND "disposalRequestId" IS NULL AND "redemptionKey" IS NULL
    AND "redemptionValueBrl" IS NULL AND "createdByUserId" IS NOT NULL
    AND "coinValueBrlSnapshot" IS NOT DISTINCT FROM 0.10::numeric
  )
);

-- Preserva todos os resgates anteriores, mas impede novos débitos iniciados pela Xerox.
CREATE OR REPLACE FUNCTION ecotroca_validate_xerox_redemption() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  payment "EcoCoinPayment"%ROWTYPE;
  wallet "EcoCoinWallet"%ROWTYPE;
BEGIN
  IF NEW.type <> 'DEBIT' THEN RETURN NEW; END IF;
  SELECT * INTO wallet FROM "EcoCoinWallet" WHERE id = NEW."walletId" FOR UPDATE;
  SELECT * INTO payment FROM "EcoCoinPayment" WHERE id = NEW."paymentId";
  IF payment.id IS NULL OR wallet.id IS NULL
    OR NEW."redemptionKey" IS NOT NULL OR NEW."redemptionValueBrl" IS NOT NULL
    OR NEW."disposalRequestId" IS NOT NULL
    OR NEW."createdByUserId" IS DISTINCT FROM payment."studentId"
    OR wallet."userId" IS DISTINCT FROM payment."studentId"
    OR NEW.amount IS DISTINCT FROM payment.amount
    OR NEW."balanceAfter" IS DISTINCT FROM payment."balanceAfter"
    OR NEW."balanceAfter" IS DISTINCT FROM wallet.balance
    OR NEW."coinValueBrlSnapshot" IS DISTINCT FROM 0.10::numeric
    OR NEW."createdAt" IS DISTINCT FROM payment."createdAt" THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Novos débitos exigem um pagamento iniciado pelo próprio estudante.';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION ecotroca_validate_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  payer_roles text[];
  recipient_roles text[];
BEGIN
  -- Mesma ordem da aplicação para evitar inversão de travas.
  PERFORM id FROM "User" WHERE id IN (NEW."studentId",NEW."recipientId") ORDER BY id FOR SHARE;
  SELECT array_agg(p.key) INTO payer_roles FROM "User" u
    JOIN "UserAccessProfile" a ON a."userId"=u.id JOIN "AccessProfile" p ON p.id=a."accessProfileId"
    WHERE u.id=NEW."studentId" AND u."isActive" AND p."isActive";
  SELECT array_agg(p.key) INTO recipient_roles FROM "User" u
    JOIN "UserAccessProfile" a ON a."userId"=u.id JOIN "AccessProfile" p ON p.id=a."accessProfileId"
    WHERE u.id=NEW."recipientId" AND u."isActive" AND p."isActive";
  IF NOT COALESCE('STUDENT'=ANY(payer_roles),false)
    OR payer_roles && ARRAY['ADMIN','LIBRARY','XEROX']::text[]
    OR NOT COALESCE('XEROX'=ANY(recipient_roles),false)
    OR recipient_roles && ARRAY['ADMIN','LIBRARY']::text[]
    OR EXISTS(SELECT 1 FROM "EcoCoinMovement" WHERE "redemptionKey"=NEW."idempotencyKey") THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Pagamento exige estudante ativo, Xerox ativa e chave exclusiva.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "EcoCoinPayment_authorization" BEFORE INSERT ON "EcoCoinPayment"
  FOR EACH ROW EXECUTE FUNCTION ecotroca_validate_payment();

CREATE FUNCTION ecotroca_require_payment_movement() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "EcoCoinMovement" m JOIN "EcoCoinWallet" w ON w.id=m."walletId"
    WHERE m."paymentId"=NEW.id AND m.type='DEBIT'
      AND w."userId"=NEW."studentId" AND m."createdByUserId"=NEW."studentId"
      AND m.amount=NEW.amount AND m."balanceAfter"=NEW."balanceAfter"
  ) THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='O pagamento e o débito devem ser registrados na mesma transação.';
  END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER "EcoCoinPayment_requires_movement" AFTER INSERT ON "EcoCoinPayment"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ecotroca_require_payment_movement();
CREATE TRIGGER "EcoCoinPayment_history_immutable" BEFORE UPDATE OR DELETE ON "EcoCoinPayment"
  FOR EACH ROW EXECUTE FUNCTION ecotroca_keep_movement_history();
COMMIT;
