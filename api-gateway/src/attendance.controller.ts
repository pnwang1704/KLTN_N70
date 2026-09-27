import { Controller, Post, Get, Body, Query, Inject, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Roles } from './common/decorators/roles.decorator';

@Controller('attendances')
export class AttendanceController {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
  ) {}

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Post('check-in')
  checkIn(@Body() dto: any, @Req() req: any) {
    const branchId = dto.branchId !== undefined ? dto.branchId : req.user?.branchId;
    return this.orderClient.send('attendance_check_in', {
      ...dto,
      branchId,
    });
  }

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Post('check-out')
  checkOut(@Body() dto: any, @Req() req: any) {
    const branchId = dto.branchId !== undefined ? dto.branchId : req.user?.branchId;
    return this.orderClient.send('attendance_check_out', {
      ...dto,
      branchId,
    });
  }

  @Roles('ADMIN', 'MANAGER')
  @Get('timesheet')
  getTimesheet(
    @Req() req: any,
    @Query('branchId') queryBranchId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    const branchId = queryBranchId || req.user?.branchId;
    return this.orderClient.send('get_timesheet', {
      branchId,
      fromDate,
      toDate,
      employeeId,
    });
  }
}
