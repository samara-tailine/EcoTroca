import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsOptional } from 'class-validator';
import { ACCESS_PROFILE_KEYS, AccessProfileKey } from '../access-profile.constants.js';
import { RegisterUserDto } from '../../auth/dto/register-user.dto.js';

export class CreateUserDto extends RegisterUserDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(ACCESS_PROFILE_KEYS.length)
  @IsIn([...ACCESS_PROFILE_KEYS], { each: true })
  accessProfileKeys?: AccessProfileKey[];
}