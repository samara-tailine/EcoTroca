import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentsService } from './payments.service.js';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ListMovementsDto } from './dto/list-movements.dto.js';
import { EcocoinsService } from './ecocoins.service.js';

type AuthenticatedRequest = { user: AuthenticatedUser };

@ApiTags('Carteiras e EcoCoins')
@Controller('ecocoins')
export class EcocoinsController {
  constructor(
    private readonly ecocoinsService: EcocoinsService,
    private readonly payments: PaymentsService,
  ) {}

  @Roles('STUDENT')
  @Get('payment-recipients')
  recipients(@Req() request: AuthenticatedRequest) {
    return this.payments.recipients(request.user);
  }

  @Roles('STUDENT')
  @Post('payments')
  pay(@Req() request: AuthenticatedRequest, @Body() dto: CreatePaymentDto) {
    return this.payments.pay(request.user, dto);
  }

  @Roles('XEROX')
  @Get('payments')
  listPayments(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListMovementsDto,
  ) {
    return this.payments.list(request.user, query);
  }

  @Roles('STUDENT', 'XEROX')
  @Get('payments/:id')
  payment(
    @Req() request: AuthenticatedRequest,
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('Identificador do comprovante inválido.'),
      }),
    )
    id: string,
  ) {
    return this.payments.get(request.user, id);
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
