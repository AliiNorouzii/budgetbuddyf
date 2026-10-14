import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/session.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto, SummaryQueryDto } from './dto/list-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListTransactionsDto) {
    return this.transactions.findAll(user.rowId, query);
  }

  @Get('summary')
  summary(@CurrentUser() user: AuthUser, @Query() query: SummaryQueryDto) {
    return this.transactions.summary(user.rowId, query.month);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTransactionDto) {
    return this.transactions.create(user.rowId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.transactions.update(user.rowId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.transactions.remove(user.rowId, id);
  }
}
