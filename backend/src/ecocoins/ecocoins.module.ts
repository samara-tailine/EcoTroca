import { PaymentsService } from './payments.service.js';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EcocoinsController } from './ecocoins.controller.js';
import { EcocoinsService } from './ecocoins.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [EcocoinsController],
  providers: [EcocoinsService, PaymentsService],
  exports: [EcocoinsService],
})
export class EcocoinsModule {}
