import { Type } from 'class-transformer';
import { IsInt, IsUUID, Max, Min, ValidateIf } from 'class-validator';

export class ListMovementsDto {
  @Type(() => Number)
  @IsInt({ message: 'A página deve ser um número inteiro.' })
  @Min(1, { message: 'A página deve ser maior que zero.' })
  @Max(1000000, { message: 'A página excede o limite permitido.' })
  page: number = 1;

  @Type(() => Number)
  @IsInt({ message: 'O tamanho da página deve ser um número inteiro.' })
  @Min(1, { message: 'O tamanho da página deve ser maior que zero.' })
  @Max(100, { message: 'Cada página pode retornar até 100 movimentações.' })
  pageSize: number = 20;

  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID(undefined, {
    message: 'O identificador do descarte deve ser um UUID válido.',
  })
  disposalRequestId?: string;
}
