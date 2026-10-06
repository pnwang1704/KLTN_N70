import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
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
    try {
      return await this.attendanceService.checkIn(dto);
    } catch (err: any) {
      throw new RpcException({
        statusCode: err.status || err.statusCode || 400,
        message: err.message || 'Lỗi chấm công vào ca',
      });
    }
  }

  @MessagePattern('attendance_check_out')
  async checkOutMsg(@Payload() dto: CheckOutDto) {
    try {
      return await this.attendanceService.checkOut(dto);
    } catch (err: any) {
      throw new RpcException({
        statusCode: err.status || err.statusCode || 400,
        message: err.message || 'Lỗi chấm công tan ca',
      });
    }
  }

  @MessagePattern('get_timesheet')
  async getTimesheetMsg(@Payload() dto: GetTimesheetDto) {
    try {
      return await this.attendanceService.getTimesheet(dto || {});
    } catch (err: any) {
      throw new RpcException({
        statusCode: err.status || err.statusCode || 400,
        message: err.message || 'Lỗi truy vấn bảng công',
      });
    }
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
