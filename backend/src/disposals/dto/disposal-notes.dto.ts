import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class DisposalNotesDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'As observações devem ser informadas em texto.' })
  @MinLength(1, {
    message: 'As observações não podem ficar vazias quando informadas.',
  })
  @MaxLength(2000, {
    message: 'As observações devem ter no máximo 2000 caracteres.',
  })
  notes?: string;
}

export class DisposalDecisionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'A justificativa deve ser informada em texto.' })
  @MinLength(1, { message: 'Informe uma justificativa para a decisão.' })
  @MaxLength(2000, {
    message: 'A justificativa deve ter no máximo 2000 caracteres.',
  })
  justification!: string;
}
