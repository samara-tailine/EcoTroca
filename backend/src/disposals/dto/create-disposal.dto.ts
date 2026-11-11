import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  FUNCTIONALITIES,
  PHYSICAL_CONDITIONS,
} from '../disposal-item.constants.js';
import type {
  Functionality,
  PhysicalCondition,
} from '../disposal-item.constants.js';

export class CreateDisposalItemDto {
  @IsUUID(undefined, {
    message: 'O identificador do equipamento deve ser um UUID válido.',
  })
  equipmentId!: string;

  @IsInt({ message: 'A quantidade deve ser um número inteiro.' })
  @Min(1, { message: 'A quantidade deve ser maior que zero.' })
  @Max(2147483647, { message: 'A quantidade excede o limite permitido.' })
  quantity!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsIn([...PHYSICAL_CONDITIONS], {
    message: 'A condição física deve ser Novo, Bom, Regular ou Danificado.',
  })
  physicalCondition!: PhysicalCondition;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsIn([...FUNCTIONALITIES], {
    message:
      'O funcionamento deve ser Funciona, Funciona parcialmente ou Não funciona.',
  })
  functionality!: Functionality;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
    },
    { message: 'A foto deve ser informada por uma URL HTTP ou HTTPS válida.' },
  )
  @MaxLength(2048, {
    message: 'A URL da foto deve ter no máximo 2048 caracteres.',
  })
  photoUrl?: string | null;
}

export class CreateDisposalDto {
  @IsArray({ message: 'Os itens devem ser informados em uma lista.' })
  @ArrayMinSize(1, { message: 'Informe pelo menos um equipamento.' })
  @ArrayMaxSize(100, {
    message: 'Cada solicitação pode conter até 100 equipamentos diferentes.',
  })
  @ArrayUnique((item: CreateDisposalItemDto | null) => item?.equipmentId, {
    message:
      'Informe cada equipamento apenas uma vez, utilizando o campo quantidade.',
  })
  @ValidateNested({
    each: true,
    message: 'Cada item deve conter dados válidos de um equipamento.',
  })
  @Type(() => CreateDisposalItemDto)
  items!: CreateDisposalItemDto[];
}
