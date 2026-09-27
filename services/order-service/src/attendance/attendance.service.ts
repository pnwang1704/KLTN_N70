import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { GetTimesheetDto } from './dto/get-timesheet.dto';
import { EmployeeService } from '../employee/employee.service';
import { ShiftService } from '../shift/shift.service';
import { Shift } from '../shift/entities/shift.entity';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    private readonly employeeService: EmployeeService,
    private readonly shiftService: ShiftService,
  ) {}

  private parseTimeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  private findMatchingShift(shifts: Shift[], now: Date): Shift {
    if (!shifts || shifts.length === 0) {
      const fallback = new Shift();
      fallback.code = 'CA_1';
      fallback.name = 'Ca 1 (06:00 - 14:00)';
      fallback.startTime = '06:00';
      fallback.endTime = '14:00';
      fallback.gracePeriodMinutes = 15;
      return fallback;
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Check which shift the current time falls into
    for (const shift of shifts) {
      const startMin = this.parseTimeToMinutes(shift.startTime);
      const endMin = this.parseTimeToMinutes(shift.endTime);

      if (startMin <= endMin) {
        if (currentMinutes >= startMin && currentMinutes <= endMin) {
          return shift;
        }
      } else {
        // Shift wraps past midnight (e.g. 22:00 -> 06:00)
        if (currentMinutes >= startMin || currentMinutes <= endMin) {
          return shift;
        }
      }
    }

    // If none directly match, pick the closest one
    let closestShift = shifts[0];
    let minDiff = 24 * 60;
    for (const shift of shifts) {
      const startMin = this.parseTimeToMinutes(shift.startTime);
      const diff = Math.abs(currentMinutes - startMin);
      if (diff < minDiff) {
        minDiff = diff;
        closestShift = shift;
      }
    }

    return closestShift;
  }

  async checkIn(dto: CheckInDto): Promise<Attendance> {
    const employee = await this.employeeService.findByCode(dto.employeeCode, dto.branchId);
    if (!employee) {
      throw new NotFoundException(`Không tìm thấy nhân viên có mã "${dto.employeeCode}" tại chi nhánh này`);
    }

    if (!employee.isActive) {
      throw new BadRequestException(`Tài khoản nhân viên "${employee.fullName}" đang bị khóa hoặc tạm ngưng`);
    }

    // Check PIN if provided and face not verified
    if (dto.faceVerified === false && dto.pinCode && employee.pinCode !== dto.pinCode) {
      throw new BadRequestException('Mã PIN xác thực không chính xác');
    }

    // Check if employee already has an open check-in (not checked out yet)
    const openAttendance = await this.attendanceRepository.findOne({
      where: { employeeId: employee.id, checkOutAt: IsNull() },
      order: { checkInAt: 'DESC' },
    });

    if (openAttendance) {
      const inTimeStr = new Date(openAttendance.checkInAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      throw new BadRequestException(
        `Nhân viên ${employee.fullName} (${employee.employeeCode}) đã vào ca lúc ${inTimeStr} và chưa hoàn tất tan ca (Check-out).`,
      );
    }

    const now = new Date();

    // Determine shift
    const activeShifts = await this.shiftService.findAll({
      branchId: dto.branchId,
      activeOnly: true,
    });
    const currentShift = this.findMatchingShift(activeShifts, now);

    // Determine ON_TIME or LATE
    const startMinutes = this.parseTimeToMinutes(currentShift.startTime);
    const graceLimit = startMinutes + (currentShift.gracePeriodMinutes || 15);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let status = 'ON_TIME';
    if (currentMinutes > graceLimit) {
      status = 'LATE';
    }

    const attendance = new Attendance();
    attendance.employeeId = employee.id;
    attendance.branchId = dto.branchId;
    attendance.shiftId = currentShift.id || null;
    attendance.shiftCode = currentShift.code;
    attendance.checkInAt = now;
    attendance.checkInPhoto = dto.snapshotPhoto;
    attendance.status = status;
    attendance.isFaceVerified = dto.faceVerified !== false;

    const saved = await this.attendanceRepository.save(attendance);
    saved.employee = employee;

    this.logger.log(
      `Check-in thành công: NV ${employee.employeeCode} (${employee.fullName}) - Ca: ${currentShift.code} - Trạng thái: ${status}`,
    );

    return saved;
  }

  async checkOut(dto: CheckOutDto): Promise<Attendance> {
    const employee = await this.employeeService.findByCode(dto.employeeCode, dto.branchId);
    if (!employee) {
      throw new NotFoundException(`Không tìm thấy nhân viên có mã "${dto.employeeCode}" tại chi nhánh này`);
    }

    const openAttendance = await this.attendanceRepository.findOne({
      where: { employeeId: employee.id, checkOutAt: IsNull() },
      order: { checkInAt: 'DESC' },
    });

    if (!openAttendance) {
      throw new BadRequestException(
        `Không tìm thấy lượt vào ca (Check-in) chưa hoàn tất của nhân viên ${employee.fullName}.`,
      );
    }

    const now = new Date();
    const diffMs = now.getTime() - new Date(openAttendance.checkInAt).getTime();
    const hours = Math.max(0, Math.round((diffMs / 3600000) * 100) / 100);

    openAttendance.checkOutAt = now;
    openAttendance.checkOutPhoto = dto.snapshotPhoto;
    openAttendance.workingHours = hours;

    if (dto.faceVerified !== undefined) {
      openAttendance.isFaceVerified = dto.faceVerified;
    }

    const saved = await this.attendanceRepository.save(openAttendance);
    saved.employee = employee;

    this.logger.log(
      `Check-out thành công: NV ${employee.employeeCode} (${employee.fullName}) - Tổng giờ: ${hours}h`,
    );

    return saved;
  }

  async getTimesheet(dto: GetTimesheetDto): Promise<Attendance[]> {
    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee');

    if (dto.branchId) {
      query.andWhere('attendance.branchId = :branchId', { branchId: dto.branchId });
    }

    if (dto.employeeId) {
      query.andWhere('attendance.employeeId = :employeeId', { employeeId: dto.employeeId });
    }

    if (dto.fromDate) {
      const from = new Date(dto.fromDate);
      from.setHours(0, 0, 0, 0);
      query.andWhere('attendance.checkInAt >= :from', { from });
    }

    if (dto.toDate) {
      const to = new Date(dto.toDate);
      to.setHours(23, 59, 59, 999);
      query.andWhere('attendance.checkInAt <= :to', { to });
    }

    query.orderBy('attendance.checkInAt', 'DESC');
    return query.getMany();
  }
}
