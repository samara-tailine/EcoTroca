import { IsBoolean } from 'class-validator';

export class UpdateEquipmentStatusDto {
  @IsBoolean()
  isActive!: boolean;
}