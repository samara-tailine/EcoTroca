import { IsString, MaxLength, MinLength } from 'class-validator';
export class GoogleAuthDto {
  @IsString({ message: 'Informe a credencial do Google.' })
  @MinLength(1, { message: 'Informe a credencial do Google.' })
  @MaxLength(10000, { message: 'Credencial do Google inválida.' })
  credential!: string;
}
export class LinkGoogleDto extends GoogleAuthDto {
  @IsString({ message: 'Confirme sua senha atual para vincular o Google.' })
  @MinLength(1, { message: 'Confirme sua senha atual para vincular o Google.' })
  @MaxLength(128, { message: 'Senha inválida.' })
  password!: string;
}
