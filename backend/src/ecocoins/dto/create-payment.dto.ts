import { Transform } from 'class-transformer';
import { Equals, IsString, IsUUID, Matches } from 'class-validator';
import { ECOCOIN_AMOUNT_PATTERN } from '../ecocoin.constants.js';

export class CreatePaymentDto {
  @Equals(undefined, {
    message: 'Não envie studentId: o pagador é sempre o estudante autenticado.',
  })
  studentId?: never;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsUUID(undefined, { message: 'Selecione uma Xerox válida.' })
  recipientId!: string;

  @Transform(({ value }) =>
    typeof value === 'number' && Number.isFinite(value)
      ? String(value)
      : typeof value === 'string'
        ? value.trim()
        : value,
  )
  @IsString({ message: 'Informe o valor em EcoCoins.' })
  @Matches(ECOCOIN_AMOUNT_PATTERN, {
    message:
      'Informe um valor positivo com até duas casas decimais, usando ponto como separador.',
  })
  amount!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsUUID(undefined, {
    message: 'Informe uma chave de idempotência UUID válida.',
  })
  idempotencyKey!: string;
}
