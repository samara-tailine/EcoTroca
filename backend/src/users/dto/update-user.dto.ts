import { Transform } from 'class-transformer';
import {
  IsEmail,
  Equals,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateUserDto {
  @Equals(undefined, {
    message:
      'Para alterar perfis, utilize a atribuição de perfis do usuário. ADMIN não pode acumular LIBRARY ou XEROX, e LIBRARY não pode acumular XEROX.',
  })
  accessProfileKeys?: never;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(64)
  studentIdentifier?: string | null;
}
