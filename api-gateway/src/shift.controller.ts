import { Controller, Get, Post, Put, Patch, Body, Param, Query, Inject, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Roles } from './common/decorators/roles.decorator';

@Controller('shifts')
export class ShiftController {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
  ) {}

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Get()
  getShifts(
    @Req() req: any,
    @Query('branchId') queryBranchId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const branchId = queryBranchId || req.user?.branchId;
    return this.orderClient.send('get_shifts', {
      branchId,
      activeOnly: activeOnly === 'true' || activeOnly === '1',
    });
  }

  @Roles('ADMIN', 'MANAGER')
  @Post()
  createShift(@Body() dto: any, @Req() req: any) {
    const branchId = dto.branchId !== undefined ? dto.branchId : req.user?.branchId;
    return this.orderClient.send('create_shift', {
      ...dto,
      branchId,
    });
  }

  @Roles('ADMIN', 'MANAGER')
  @Put(':id')
  updateShift(@Param('id') id: string, @Body() dto: any) {
    return this.orderClient.send('update_shift', {
      id,
      dto,
    });
  }

  @Roles('ADMIN', 'MANAGER')
  @Patch(':id/toggle')
  toggleShift(@Param('id') id: string) {
    return this.orderClient.send('toggle_shift', { id });
  }
}
