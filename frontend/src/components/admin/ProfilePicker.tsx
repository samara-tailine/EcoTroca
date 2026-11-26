import { profileLabel } from "../../auth/profileLabels";
import {
  PROFILE_KEYS,
  profileCombinationError,
} from "../../utils/userProfiles";
import type { ProfileKey } from "../../utils/userProfiles";
import type { UserProfile } from "../../services/users";
export function ProfilePicker({
  profiles,
  selected,
  onChange,
  disabled = false,
}: {
  profiles: UserProfile[];
  selected: ProfileKey[];
  onChange: (keys: ProfileKey[]) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="user-profile-picker" disabled={disabled}>
      <legend>Perfis de acesso</legend>
      <p className="field-help">
        Administrador técnico, Biblioteca e Xerox são mutuamente exclusivos.
        Estudante pode acompanhar um deles.
      </p>
      <div className="user-profile-options">
        {PROFILE_KEYS.map((key) => {
          const checked = selected.includes(key),
            available = profiles.some((p) => p.key === key);
          const conflict = !checked
            ? profileCombinationError([...selected, key])
            : null;
          return (
            <label
              key={key}
              title={
                !available ? "Perfil indisponível" : (conflict ?? undefined)
              }
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={(!available && !checked) || !!conflict}
                onChange={() =>
                  onChange(
                    checked
                      ? selected.filter((p) => p !== key)
                      : [...selected, key],
                  )
                }
              />
              <span>
                {profileLabel(key)}
                {!available && " (indisponível)"}
              </span>
            </label>
          );
        })}
      </div>
      {!selected.length && (
        <p className="notice">
          Sem perfis, a conta perde acesso às áreas funcionais. Confirme se essa
          remoção é intencional.
        </p>
      )}
      <p className="field-help">
        Para trocar um perfil exclusivo, desmarque o atual e selecione o novo.
      </p>
    </fieldset>
  );
}
