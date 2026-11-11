BEGIN;

-- AlterEnum
ALTER TYPE "DisposalStatus" ADD VALUE 'RECEIVED';

-- AlterTable
ALTER TABLE "DisposalItem" ADD COLUMN     "equipmentNameSnapshot" VARCHAR(160),
ADD COLUMN     "functionality" VARCHAR(500),
ADD COLUMN     "photoUrl" VARCHAR(2048),
ADD COLUMN     "physicalCondition" VARCHAR(500);

-- AlterTable
ALTER TABLE "DisposalRequest" ADD COLUMN     "checkedAt" TIMESTAMPTZ(6),
ADD COLUMN     "receivedAt" TIMESTAMPTZ(6),
ADD COLUMN     "totalWeightGramsSnapshot" INTEGER,
ALTER COLUMN "conversionRateCoinsPerKgSnapshot" DROP NOT NULL;

-- CreateTable
CREATE TABLE "DisposalStatusHistory" (
    "id" UUID NOT NULL,
    "disposalRequestId" UUID NOT NULL,
    "actorId" UUID,
    "fromStatus" "DisposalStatus",
    "toStatus" "DisposalStatus" NOT NULL,
    "notes" VARCHAR(2000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisposalStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DisposalStatusHistory_disposalRequestId_createdAt_idx" ON "DisposalStatusHistory"("disposalRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "DisposalStatusHistory_actorId_idx" ON "DisposalStatusHistory"("actorId");

-- AddForeignKey
ALTER TABLE "DisposalStatusHistory" ADD CONSTRAINT "DisposalStatusHistory_disposalRequestId_fkey" FOREIGN KEY ("disposalRequestId") REFERENCES "DisposalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisposalStatusHistory" ADD CONSTRAINT "DisposalStatusHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Totais legados derivam exclusivamente dos snapshots já existentes, nunca do
-- peso atual do catálogo. Registros sem itens permanecem sem total conhecido.
WITH totals AS (
  SELECT "disposalRequestId", SUM("quantity"::bigint * "averageWeightGramsSnapshot"::bigint) AS grams
  FROM "DisposalItem" GROUP BY "disposalRequestId"
)
UPDATE "DisposalRequest" AS request
SET "totalWeightGramsSnapshot" = totals.grams::integer
FROM totals
WHERE request."id" = totals."disposalRequestId"
  AND totals.grams BETWEEN 1 AND 2147483647;

ALTER TABLE "DisposalRequest" ADD CONSTRAINT "DisposalRequest_totalWeight_positive_check"
  CHECK ("totalWeightGramsSnapshot" IS NULL OR "totalWeightGramsSnapshot" > 0);

-- Preserva o último estado conhecido, sem inventar etapas anteriores ou condições físicas.
INSERT INTO "DisposalStatusHistory" ("id", "disposalRequestId", "actorId", "fromStatus", "toStatus", "notes", "createdAt")
SELECT gen_random_uuid(), request."id", COALESCE(request."reviewedById", request."requesterId"), NULL,
       request."status", 'Status anterior à implantação do histórico detalhado; etapas anteriores não reconstruídas.',
       COALESCE(request."approvedAt", request."reviewedAt", request."requestedAt")
FROM "DisposalRequest" AS request;
COMMIT;
