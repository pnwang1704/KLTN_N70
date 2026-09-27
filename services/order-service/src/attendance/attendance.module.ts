import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './entities/attendance.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { EmployeeModule } from '../employee/employee.module';
import { ShiftModule } from '../shift/shift.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance]),
    EmployeeModule,
    ShiftModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
