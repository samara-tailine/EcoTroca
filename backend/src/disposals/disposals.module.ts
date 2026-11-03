import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DisposalsController } from './disposals.controller.js';
import { DisposalsService } from './disposals.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [DisposalsController],
  providers: [DisposalsService],
  exports: [DisposalsService],
})
export class DisposalsModule {}