import { Injectable, NotFoundException, BadRequestException, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shift } from './entities/shift.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

@Injectable()
export class ShiftService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ShiftService.name);

  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedDefaultShifts();
  }

  private async seedDefaultShifts() {
    try {
      const count = await this.shiftRepository.count();
      if (count === 0) {
        this.logger.log('No shifts found in database. Seeding default shifts (Ca 1 & Ca 2)...');
        const s1 = new Shift();
        s1.code = 'CA_1';
        s1.name = 'Ca 1 (06:00 - 14:00)';
        s1.startTime = '06:00';
        s1.endTime = '14:00';
        s1.gracePeriodMinutes = 15;
        s1.isActive = true;

        const s2 = new Shift();
        s2.code = 'CA_2';
        s2.name = 'Ca 2 (14:00 - 22:00)';
        s2.startTime = '14:00';
        s2.endTime = '22:00';
        s2.gracePeriodMinutes = 15;
        s2.isActive = true;

        await this.shiftRepository.save([s1, s2]);
        this.logger.log('Seeded 2 default shifts successfully.');
      }
    } catch (error: any) {
      this.logger.error('Failed to seed default shifts:', error.message);
    }
  }

  async findAll(params: { branchId?: string; activeOnly?: boolean }): Promise<Shift[]> {
    const { branchId, activeOnly } = params;
    const query = this.shiftRepository.createQueryBuilder('shift');

    if (activeOnly) {
      query.andWhere('shift.isActive = :isActive', { isActive: true });
    }

    if (branchId) {
      query.andWhere('(shift.branchId = :branchId OR shift.branchId IS NULL)', { branchId });
    }

    query.orderBy('shift.startTime', 'ASC');
    return query.getMany();
  }

  async findOne(id: string): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({ where: { id } });
    if (!shift) {
      throw new NotFoundException(`Ca làm việc với ID ${id} không tồn tại`);
    }
    return shift;
  }

  async create(dto: CreateShiftDto): Promise<Shift> {
    const existing = await this.shiftRepository.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new BadRequestException(`Mã ca làm việc '${dto.code}' đã tồn tại`);
    }

    const shift = new Shift();
    shift.branchId = dto.branchId || null;
    shift.code = dto.code.trim().toUpperCase();
    shift.name = dto.name.trim();
    shift.startTime = dto.startTime.trim();
    shift.endTime = dto.endTime.trim();
    shift.gracePeriodMinutes = dto.gracePeriodMinutes !== undefined ? dto.gracePeriodMinutes : 15;
    shift.isActive = dto.isActive !== undefined ? dto.isActive : true;

    return this.shiftRepository.save(shift);
  }

  async update(id: string, dto: UpdateShiftDto): Promise<Shift> {
    const shift = await this.findOne(id);

    if (dto.code && dto.code.trim().toUpperCase() !== shift.code) {
      const existing = await this.shiftRepository.findOne({
        where: { code: dto.code.trim().toUpperCase() },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Mã ca làm việc '${dto.code}' đã tồn tại`);
      }
      shift.code = dto.code.trim().toUpperCase();
    }

    if (dto.name !== undefined) shift.name = dto.name.trim();
    if (dto.startTime !== undefined) shift.startTime = dto.startTime.trim();
    if (dto.endTime !== undefined) shift.endTime = dto.endTime.trim();
    if (dto.gracePeriodMinutes !== undefined) shift.gracePeriodMinutes = dto.gracePeriodMinutes;
    if (dto.isActive !== undefined) shift.isActive = dto.isActive;
    if (dto.branchId !== undefined) shift.branchId = dto.branchId || null;

    return this.shiftRepository.save(shift);
  }

  async toggleStatus(id: string): Promise<Shift> {
    const shift = await this.findOne(id);
    shift.isActive = !shift.isActive;
    return this.shiftRepository.save(shift);
  }
}
