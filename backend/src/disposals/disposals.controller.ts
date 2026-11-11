import { CheckDisposalDto } from './dto/check-disposal.dto.js';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CreateDisposalDto } from './dto/create-disposal.dto.js';
import {
  DisposalDecisionDto,
  DisposalNotesDto,
} from './dto/disposal-notes.dto.js';
import { ListDisposalsDto } from './dto/list-disposals.dto.js';
import { DisposalsService } from './disposals.service.js';

type AuthenticatedRequest = { user: AuthenticatedUser };
const requestIdPipe = new ParseUUIDPipe({
  exceptionFactory: () =>
    new BadRequestException(
      'O identificador da solicitação deve ser um UUID válido.',
    ),
});

@ApiTags('Solicitações de descarte')
@Controller('disposals')
export class DisposalsController {
  constructor(private readonly disposalsService: DisposalsService) {}

  @Roles('STUDENT')
  @Post()
  @ApiOperation({
    summary: 'Criar uma solicitação de descarte do estudante autenticado',
  })
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateDisposalDto) {
    return this.disposalsService.create(request.user, dto);
  }

  @Roles('STUDENT', 'LIBRARY')
  @Get()
  @ApiOperation({
    summary: 'Listar solicitações próprias ou a fila da Biblioteca',
  })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListDisposalsDto,
  ) {
    return this.disposalsService.findAll(request.user, query);
  }

  @Roles('STUDENT', 'LIBRARY')
  @Get(':id')
  @ApiOperation({ summary: 'Consultar solicitação e seu histórico de status' })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', requestIdPipe) id: string,
  ) {
    return this.disposalsService.findOne(request.user, id);
  }

  @Roles('LIBRARY')
  @Patch(':id/receive')
  @ApiOperation({
    summary: 'Registrar o recebimento dos equipamentos pela Biblioteca',
  })
  receive(
    @Req() request: AuthenticatedRequest,
    @Param('id', requestIdPipe) id: string,
    @Body() dto: DisposalNotesDto,
  ) {
    return this.disposalsService.receive(request.user, id, dto);
  }

  @Roles('LIBRARY')
  @Patch(':id/check')
  @ApiOperation({
    summary:
      'Registrar a conferência e suas divergências, preservando as declarações originais',
  })
  check(
    @Req() request: AuthenticatedRequest,
    @Param('id', requestIdPipe) id: string,
    @Body() dto: CheckDisposalDto,
  ) {
    return this.disposalsService.check(request.user, id, dto);
  }

  @Roles('LIBRARY')
  @Patch(':id/approve')
  @ApiOperation({
    summary:
      'Aprovar uma solicitação conferida e creditar EcoCoins atomicamente',
  })
  approve(
    @Req() request: AuthenticatedRequest,
    @Param('id', requestIdPipe) id: string,
    @Body() dto: DisposalDecisionDto,
  ) {
    return this.disposalsService.approve(request.user, id, dto);
  }

  @Roles('LIBRARY')
  @Patch(':id/reject')
  @ApiOperation({
    summary: 'Rejeitar uma solicitação aberta com justificativa',
  })
  reject(
    @Req() request: AuthenticatedRequest,
    @Param('id', requestIdPipe) id: string,
    @Body() dto: DisposalDecisionDto,
  ) {
    return this.disposalsService.reject(request.user, id, dto);
  }
}
