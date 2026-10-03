import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { RegisterFaceDto } from './dto/register-face.dto';

@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  // ================= RabbitMQ Message Patterns =================
  @MessagePattern('get_employees')
  async getEmployeesMsg(@Payload() data: { branchId?: string; isActive?: boolean }) {
    return this.employeeService.findAll(data || {});
  }

  @MessagePattern('get_employee')
  async getEmployeeMsg(@Payload() data: { id: string }) {
    return this.employeeService.findOne(data.id);
  }

  @MessagePattern('get_next_employee_code')
  async getNextEmployeeCodeMsg(@Payload() data?: { branchId?: string }) {
    const nextCode = await this.employeeService.getNextEmployeeCode(data?.branchId);
    return { nextCode };
  }

  @MessagePattern('create_employee')
  async createEmployeeMsg(@Payload() dto: CreateEmployeeDto) {
    return this.employeeService.create(dto);
  }

  @MessagePattern('update_employee')
  async updateEmployeeMsg(@Payload() data: { id: string; dto: UpdateEmployeeDto }) {
    return this.employeeService.update(data.id, data.dto);
  }

  @MessagePattern('update_employee_face')
  async updateEmployeeFaceMsg(@Payload() data: { id: string; descriptor: number[]; avatarBase64?: string }) {
    return this.employeeService.registerFace(data.id, data.descriptor, data.avatarBase64);
  }

  // ================= Direct REST Endpoints =================
  @Get()
  async getEmployees(
    @Query('branchId') branchId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.employeeService.findAll({
      branchId,
      isActive: isActive !== undefined ? isActive === 'true' || isActive === '1' : undefined,
    });
  }

  @Get('next-code')
  async getNextEmployeeCode(@Query('branchId') branchId?: string) {
    const nextCode = await this.employeeService.getNextEmployeeCode(branchId);
    return { nextCode };
  }

  @Get(':id')
  async getEmployee(@Param('id') id: string) {
    return this.employeeService.findOne(id);
  }

  @Post()
  async createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.employeeService.create(dto);
  }

  @Put(':id')
  async updateEmployee(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeeService.update(id, dto);
  }

  @Put(':id/face')
  async registerFace(@Param('id') id: string, @Body() dto: RegisterFaceDto) {
    return this.employeeService.registerFace(id, dto.descriptor, dto.avatarBase64);
  }
}
