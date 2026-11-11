import { Type } from 'class-transformer';
import { IsEnum, IsInt, Max, Min, ValidateIf } from 'class-validator';
import { DisposalStatus } from '../../generated/prisma/client.js';

export class ListDisposalsDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(DisposalStatus, { message: 'Informe um status de descarte válido.' })
  status?: DisposalStatus;

  @Type(() => Number)
  @IsInt({ message: 'A página deve ser um número inteiro.' })
  @Min(1, { message: 'A página deve ser maior que zero.' })
  @Max(1000000, { message: 'A página excede o limite permitido.' })
  page: number = 1;

  @Type(() => Number)
  @IsInt({ message: 'O tamanho da página deve ser um número inteiro.' })
  @Min(1, { message: 'O tamanho da página deve ser maior que zero.' })
  @Max(100, { message: 'Cada página pode retornar até 100 solicitações.' })
  pageSize: number = 20;
}
