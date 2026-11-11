BEGIN;

-- CreateTable
CREATE TABLE "DisposalItemDivergence" (
    "id" UUID NOT NULL,
    "disposalItemId" UUID NOT NULL,
    "recordedById" UUID NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "quantityObserved" INTEGER,
    "physicalConditionObserved" VARCHAR(20),
    "functionalityObserved" VARCHAR(40),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisposalItemDivergence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DisposalItemDivergence_disposalItemId_key" ON "DisposalItemDivergence"("disposalItemId");

-- CreateIndex
CREATE INDEX "DisposalItemDivergence_recordedById_idx" ON "DisposalItemDivergence"("recordedById");

-- AddForeignKey
ALTER TABLE "DisposalItemDivergence" ADD CONSTRAINT "DisposalItemDivergence_disposalItemId_fkey" FOREIGN KEY ("disposalItemId") REFERENCES "DisposalItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisposalItemDivergence" ADD CONSTRAINT "DisposalItemDivergence_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- NOT VALID preserva eventuais descrições livres e aprovações históricas.
-- O PostgreSQL já aplica as restrições a todas as novas inserções/atualizações.
ALTER TABLE "DisposalItem"
  ADD CONSTRAINT "DisposalItem_physicalCondition_standard_check"
    CHECK ("physicalCondition" IS NULL OR "physicalCondition" IN ('Novo', 'Bom', 'Regular', 'Danificado')) NOT VALID,
  ADD CONSTRAINT "DisposalItem_functionality_standard_check"
    CHECK ("functionality" IS NULL OR "functionality" IN ('Funciona', 'Funciona parcialmente', 'Não funciona')) NOT VALID;

ALTER TABLE "DisposalRequest"
  ADD CONSTRAINT "DisposalRequest_no_self_approval_check"
    CHECK ("status" <> 'APPROVED' OR "reviewedById" IS DISTINCT FROM "requesterId") NOT VALID;

ALTER TABLE "DisposalItemDivergence"
  ADD CONSTRAINT "DisposalItemDivergence_description_check"
    CHECK (length(btrim("description")) > 0),
  ADD CONSTRAINT "DisposalItemDivergence_quantity_check"
    CHECK ("quantityObserved" IS NULL OR "quantityObserved" >= 0),
  ADD CONSTRAINT "DisposalItemDivergence_physicalCondition_check"
    CHECK ("physicalConditionObserved" IS NULL OR "physicalConditionObserved" IN ('Novo', 'Bom', 'Regular', 'Danificado')),
  ADD CONSTRAINT "DisposalItemDivergence_functionality_check"
    CHECK ("functionalityObserved" IS NULL OR "functionalityObserved" IN ('Funciona', 'Funciona parcialmente', 'Não funciona'));
COMMIT;
