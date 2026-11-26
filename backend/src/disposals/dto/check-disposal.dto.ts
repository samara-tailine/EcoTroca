import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
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
import { DisposalNotesDto } from './disposal-notes.dto.js';

export class DisposalDivergenceDto {
  @IsUUID(undefined, {
    message: 'O identificador do item deve ser um UUID válido.',
  })
  itemId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'A descrição da divergência deve ser um texto.' })
  @MinLength(1, {
    message: 'Descreva a divergência encontrada na conferência.',
  })
  @MaxLength(2000, {
    message: 'A descrição da divergência deve ter no máximo 2000 caracteres.',
  })
  description!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt({ message: 'A quantidade observada deve ser um número inteiro.' })
  @Min(0, { message: 'A quantidade observada não pode ser negativa.' })
  @Max(2147483647, {
    message: 'A quantidade observada excede o limite permitido.',
  })
  quantityObserved?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsIn([...PHYSICAL_CONDITIONS], {
    message:
      'A condição física observada deve ser Novo, Bom, Regular ou Danificado.',
  })
  physicalConditionObserved?: PhysicalCondition;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsIn([...FUNCTIONALITIES], {
    message:
      'O funcionamento observado deve ser Funciona, Funciona parcialmente ou Não funciona.',
  })
  functionalityObserved?: Functionality;
}

export class CheckedDisposalItemDto {
  @IsUUID(undefined, {
    message: 'O identificador do item conferido deve ser um UUID válido.',
  })
  itemId!: string;
  @IsInt({ message: 'A quantidade conferida deve ser um número inteiro.' })
  @Min(0, { message: 'A quantidade conferida não pode ser negativa.' })
  @Max(2147483647, {
    message: 'A quantidade conferida excede o limite permitido.',
  })
  quantityObserved!: number;
}
export class CheckDisposalDto extends DisposalNotesDto {
  @IsArray({ message: 'Informe as quantidades conferidas de todos os itens.' })
  @ArrayMinSize(1, { message: 'Confira pelo menos um item.' })
  @ArrayMaxSize(100, { message: 'A conferência aceita até 100 itens.' })
  @ArrayUnique((item: CheckedDisposalItemDto | null) => item?.itemId, {
    message: 'Informe cada item conferido apenas uma vez.',
  })
  @ValidateNested({
    each: true,
    message: 'Cada item conferido deve conter dados válidos.',
  })
  @Type(() => CheckedDisposalItemDto)
  items!: CheckedDisposalItemDto[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray({ message: 'As divergências devem ser informadas em uma lista.' })
  @ArrayMaxSize(100, {
    message: 'A conferência pode registrar até 100 itens com divergência.',
  })
  @ArrayUnique((item: DisposalDivergenceDto | null) => item?.itemId, {
    message: 'Informe cada item apenas uma vez na lista de divergências.',
  })
  @ValidateNested({
    each: true,
    message: 'Cada divergência deve conter dados válidos.',
  })
  @Type(() => DisposalDivergenceDto)
  divergences?: DisposalDivergenceDto[];
}
