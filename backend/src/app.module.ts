import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { DisposalsModule } from './disposals/disposals.module.js';
import { EcocoinsModule } from './ecocoins/ecocoins.module.js';
import { EquipmentModule } from './equipment/equipment.module.js';
import { HealthController } from './health/health.controller.js';
import { SettingsModule } from './settings/settings.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    CategoriesModule,
    EquipmentModule,
    DisposalsModule,
    EcocoinsModule,
    SettingsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}