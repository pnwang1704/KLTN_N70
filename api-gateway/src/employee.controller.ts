import { Controller, Get, Post, Put, Body, Param, Query, Inject, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Roles } from './common/decorators/roles.decorator';
import { Public } from './common/decorators/public.decorator';

@Controller('employees')
export class EmployeeController {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
  ) {}

  @Public()
  @Get()
  getEmployees(
    @Req() req: any,
    @Query('branchId') queryBranchId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const branchId = queryBranchId || req.user?.branchId || '1';
    return this.orderClient.send('get_employees', {
      branchId,
      isActive: isActive !== undefined ? isActive === 'true' || isActive === '1' : undefined,
    });
  }

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Get('next-code')
  getNextEmployeeCode(
    @Req() req: any,
    @Query('branchId') queryBranchId?: string,
  ) {
    const branchId = queryBranchId || req.user?.branchId;
    return this.orderClient.send('get_next_employee_code', { branchId });
  }

  @Roles('ADMIN', 'MANAGER')
  @Get(':id')
  getEmployee(@Param('id') id: string) {
    return this.orderClient.send('get_employee', { id });
  }

  @Roles('ADMIN', 'MANAGER')
  @Post()
  createEmployee(@Body() dto: any, @Req() req: any) {
    const branchId = dto.branchId !== undefined ? dto.branchId : req.user?.branchId;
    return this.orderClient.send('create_employee', {
      ...dto,
      branchId,
    });
  }

  @Roles('ADMIN', 'MANAGER')
  @Put(':id')
  updateEmployee(@Param('id') id: string, @Body() dto: any) {
    return this.orderClient.send('update_employee', {
      id,
      dto,
    });
  }

  @Roles('ADMIN', 'MANAGER')
  @Put(':id/face')
  registerFace(@Param('id') id: string, @Body() dto: any) {
    return this.orderClient.send('update_employee_face', {
      id,
      descriptor: dto.descriptor,
      avatarBase64: dto.avatarBase64,
    });
  }
}
