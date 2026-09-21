import { Controller, Get, Post, Put, Patch, Body, Param, Query } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ShiftService } from './shift.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

@Controller('shifts')
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  // ==========================================
  // RabbitMQ Message Patterns (RPC)
  // ==========================================

  @MessagePattern('get_shifts')
  async handleGetShifts(@Payload() payload: { branchId?: string; activeOnly?: boolean }) {
    return this.shiftService.findAll(payload || {});
  }

  @MessagePattern('create_shift')
  async handleCreateShift(@Payload() dto: CreateShiftDto) {
    return this.shiftService.create(dto);
  }

  @MessagePattern('update_shift')
  async handleUpdateShift(@Payload() payload: { id: string; dto: UpdateShiftDto }) {
    return this.shiftService.update(payload.id, payload.dto);
  }

  @MessagePattern('toggle_shift')
  async handleToggleShift(@Payload() payload: { id: string }) {
    return this.shiftService.toggleStatus(payload.id);
  }

  // ==========================================
  // Direct HTTP Endpoints
  // ==========================================

  @Get()
  async findAllHttp(
    @Query('branchId') branchId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.shiftService.findAll({
      branchId,
      activeOnly: activeOnly === 'true' || activeOnly === '1',
    });
  }

  @Get(':id')
  async findOneHttp(@Param('id') id: string) {
    return this.shiftService.findOne(id);
  }

  @Post()
  async createHttp(@Body() dto: CreateShiftDto) {
    return this.shiftService.create(dto);
  }

  @Put(':id')
  async updateHttp(@Param('id') id: string, @Body() dto: UpdateShiftDto) {
    return this.shiftService.update(id, dto);
  }

  @Patch(':id/toggle')
  async toggleStatusHttp(@Param('id') id: string) {
    return this.shiftService.toggleStatus(id);
  }
}
