import { CreateRedemptionDto } from './dto/create-redemption.dto.js';
import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ListMovementsDto } from './dto/list-movements.dto.js';
import { EcocoinsService } from './ecocoins.service.js';

type AuthenticatedRequest = { user: AuthenticatedUser };

@ApiTags('Carteiras e EcoCoins')
@Controller('ecocoins')
export class EcocoinsController {
  constructor(private readonly ecocoinsService: EcocoinsService) {}

  @Roles('XEROX')
  @Post('redemptions')
  @ApiOperation({
    summary:
      'Registrar resgate de EcoCoins para desconto na Xerox, com idempotência',
  })
  redeem(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateRedemptionDto,
  ) {
    return this.ecocoinsService.redeem(request.user, dto);
  }

  @Roles('STUDENT')
  @Get('wallet')
  @ApiOperation({ summary: 'Consultar a própria carteira de EcoCoins' })
  wallet(@Req() request: AuthenticatedRequest) {
    return this.ecocoinsService.getOwnWallet(request.user);
  }

  @Roles('STUDENT')
  @Get('movements')
  @ApiOperation({ summary: 'Consultar as movimentações da própria carteira' })
  movements(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListMovementsDto,
  ) {
    return this.ecocoinsService.getOwnMovements(request.user, query);
  }

  @Roles('LIBRARY')
  @Get('credits')
  @ApiOperation({
    summary:
      'Consultar créditos de descartes processados pelo usuário da Biblioteca',
  })
  credits(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListMovementsDto,
  ) {
    return this.ecocoinsService.getProcessedCredits(request.user, query);
  }
}
