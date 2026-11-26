BEGIN;
-- Impede atribuições concorrentes durante a verificação e a atualização da política.
LOCK TABLE "UserAccessProfile" IN SHARE ROW EXCLUSIVE MODE;
-- Não corrige nem remove atribuições: ambientes com conflitos devem parar aqui.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "UserAccessProfile" a JOIN "AccessProfile" p ON p.id=a."accessProfileId"
    GROUP BY a."userId"
    HAVING (bool_or(p.key='ADMIN') AND bool_or(p.key IN ('LIBRARY','XEROX')))
      OR (bool_or(p.key='LIBRARY') AND bool_or(p.key='XEROX'))
  ) THEN
    RAISE EXCEPTION USING ERRCODE='23514',
      MESSAGE='Existem contas com perfis incompatíveis: ADMIN com LIBRARY/XEROX ou LIBRARY com XEROX. Nenhuma conta foi alterada; resolva os conflitos antes da migração.';
  END IF;
END $$;

-- O trigger existente cobre INSERT e UPDATE, inclusive createMany, upsert e SQL direto.
-- Mantém a serialização por usuário e a exclusão da atribuição antiga em UPDATE.
CREATE OR REPLACE FUNCTION ecotroca_check_profile_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_key text;
  excluded_user uuid;
  excluded_profile uuid;
BEGIN
  -- A atualização sem mudança de valor serializa atribuições à mesma conta e
  -- provoca conflito de serialização em snapshots antigos. Não altera updatedAt
  -- nem qualquer valor do usuário; evita combinações proibidas em concorrência.
  UPDATE "User" SET id = id WHERE id = NEW."userId";
  SELECT key INTO target_key FROM "AccessProfile" WHERE id = NEW."accessProfileId";
  IF TG_OP = 'UPDATE' THEN
    excluded_user := OLD."userId";
    excluded_profile := OLD."accessProfileId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM "UserAccessProfile" a
    JOIN "AccessProfile" p ON p.id = a."accessProfileId"
    WHERE a."userId" = NEW."userId"
      AND NOT (a."userId" IS NOT DISTINCT FROM excluded_user AND a."accessProfileId" IS NOT DISTINCT FROM excluded_profile)
      AND ((target_key = 'ADMIN' AND p.key IN ('LIBRARY', 'XEROX'))
        OR (target_key IN ('LIBRARY', 'XEROX') AND p.key = 'ADMIN')
        OR (target_key = 'LIBRARY' AND p.key = 'XEROX')
        OR (target_key = 'XEROX' AND p.key = 'LIBRARY'))
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'UserAccessProfile_technical_operational_exclusive',
      MESSAGE = 'Combinação de perfis inválida: ADMIN não pode acumular LIBRARY ou XEROX, e LIBRARY não pode acumular XEROX.';
  END IF;
  RETURN NEW;
END $$;
COMMIT;
