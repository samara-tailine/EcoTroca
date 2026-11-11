import { Transform } from 'class-transformer';
import { IsString, IsUUID, Matches } from 'class-validator';
import { ECOCOIN_AMOUNT_PATTERN } from '../ecocoin.constants.js';

export class CreateRedemptionDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsUUID(undefined, {
    message: 'O identificador do estudante deve ser um UUID válido.',
  })
  studentId!: string;

  @Transform(({ value }) =>
    typeof value === 'number' && Number.isFinite(value)
      ? String(value)
      : typeof value === 'string'
        ? value.trim()
        : value,
  )
  @IsString({
    message: 'Informe a quantidade de EcoCoins com até duas casas decimais.',
  })
  @Matches(ECOCOIN_AMOUNT_PATTERN, {
    message:
      'A quantidade deve ser positiva, com até 12 dígitos inteiros e duas casas decimais, usando ponto como separador.',
  })
  amount!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsUUID(undefined, {
    message:
      'Informe uma chave de idempotência UUID válida para identificar este resgate.',
  })
  idempotencyKey!: string;
}
