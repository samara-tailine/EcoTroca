BEGIN;

-- Bloqueia a migração em outros ambientes com conflitos, sem escolher ou remover perfis.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "UserAccessProfile" a
    JOIN "AccessProfile" p ON p.id = a."accessProfileId"
    GROUP BY a."userId"
    HAVING bool_or(p.key = 'ADMIN') AND bool_or(p.key IN ('LIBRARY', 'XEROX'))
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'Existem contas com perfis técnicos e operacionais incompatíveis. Resolva os conflitos antes de aplicar a migração.';
  END IF;
END $$;

-- O peso é definido na criação e permanece imutável, independentemente de nome,
-- categoria ou identificação oficial. Nenhum dado de catálogo/histórico é atualizado.
CREATE FUNCTION ecotroca_keep_equipment_weight() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."averageWeightGrams" IS DISTINCT FROM OLD."averageWeightGrams" THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'Equipment_weight_immutable',
      MESSAGE = 'O peso do equipamento é fixo e não pode ser alterado por nenhum perfil.';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "Equipment_weight_immutable"
BEFORE UPDATE ON "Equipment"
FOR EACH ROW EXECUTE FUNCTION ecotroca_keep_equipment_weight();

CREATE FUNCTION ecotroca_check_profile_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
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
        OR (target_key IN ('LIBRARY', 'XEROX') AND p.key = 'ADMIN'))
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'UserAccessProfile_technical_operational_exclusive',
      MESSAGE = 'O perfil Administrador técnico não pode acumular perfis da Biblioteca ou da Xerox.';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "UserAccessProfile_technical_operational_exclusive"
BEFORE INSERT OR UPDATE ON "UserAccessProfile"
FOR EACH ROW EXECUTE FUNCTION ecotroca_check_profile_assignment();

-- As quatro chaves internas não podem ser renomeadas, inclusive por SQL, pois
-- são parte das regras de autorização. Rótulos e descrições continuam independentes.
CREATE FUNCTION ecotroca_keep_core_profile_keys() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.key IS DISTINCT FROM OLD.key
    AND (OLD.key IN ('STUDENT', 'LIBRARY', 'XEROX', 'ADMIN')
      OR NEW.key IN ('STUDENT', 'LIBRARY', 'XEROX', 'ADMIN')) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'AccessProfile_core_key_immutable',
      MESSAGE = 'Os identificadores internos dos perfis do sistema não podem ser alterados.';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "AccessProfile_core_key_immutable"
BEFORE UPDATE ON "AccessProfile"
FOR EACH ROW EXECUTE FUNCTION ecotroca_keep_core_profile_keys();

COMMIT;