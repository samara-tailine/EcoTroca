import { ArrayUnique, IsArray, IsIn } from 'class-validator';
import {
  ACCESS_PROFILE_KEYS,
  AccessProfileKey,
} from '../access-profile.constants.js';

export class SetUserAccessProfilesDto {
  @IsArray()
  @ArrayUnique()
  @IsIn([...ACCESS_PROFILE_KEYS], { each: true })
  accessProfileKeys!: AccessProfileKey[];
}