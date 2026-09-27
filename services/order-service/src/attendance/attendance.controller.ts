import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { GetTimesheetDto } from './dto/get-timesheet.dto';

@Controller('attendances')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ================= RabbitMQ Message Patterns =================
  @MessagePattern('attendance_check_in')
  async checkInMsg(@Payload() dto: CheckInDto) {
    return this.attendanceService.checkIn(dto);
  }

  @MessagePattern('attendance_check_out')
  async checkOutMsg(@Payload() dto: CheckOutDto) {
    return this.attendanceService.checkOut(dto);
  }

  @MessagePattern('get_timesheet')
  async getTimesheetMsg(@Payload() dto: GetTimesheetDto) {
    return this.attendanceService.getTimesheet(dto || {});
  }

  // ================= Direct REST Endpoints =================
  @Post('check-in')
  async checkIn(@Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(dto);
  }

  @Post('check-out')
  async checkOut(@Body() dto: CheckOutDto) {
    return this.attendanceService.checkOut(dto);
  }

  @Get('timesheet')
  async getTimesheet(@Query() query: GetTimesheetDto) {
    return this.attendanceService.getTimesheet(query);
  }
}
