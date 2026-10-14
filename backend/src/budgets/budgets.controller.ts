import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/session.service';
import { SummaryQueryDto } from '../transactions/dto/list-transactions.dto';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/create-budget.dto';

@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: SummaryQueryDto) {
    return this.budgets.findAll(user.rowId, query.month);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBudgetDto) {
    return this.budgets.create(user.rowId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateBudgetDto) {
    return this.budgets.update(user.rowId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.budgets.remove(user.rowId, id);
  }
}
