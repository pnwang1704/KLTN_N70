import { Injectable, NotFoundException, BadRequestException, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeeService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedDefaultEmployees();
  }

  private async seedDefaultEmployees() {
    try {
      const count = await this.employeeRepository.count();
      if (count === 0) {
        this.logger.log('No employees found in database. Seeding default employees...');
        const e1 = new Employee();
        e1.branchId = '1';
        e1.employeeCode = 'NV01';
        e1.fullName = 'Nguyễn Văn Thu Ngân';
        e1.role = 'CASHIER';
        e1.pinCode = '1234';
        e1.isActive = true;

        const e2 = new Employee();
        e2.branchId = '1';
        e2.employeeCode = 'NV02';
        e2.fullName = 'Trần Thị Pha Chế';
        e2.role = 'BARISTA';
        e2.pinCode = '1234';
        e2.isActive = true;

        const e3 = new Employee();
        e3.branchId = '1';
        e3.employeeCode = 'NV03';
        e3.fullName = 'Lê Văn Phục Vụ';
        e3.role = 'WAITER';
        e3.pinCode = '1234';
        e3.isActive = true;

        await this.employeeRepository.save([e1, e2, e3]);
        this.logger.log('Seeded 3 default employees successfully (NV01, NV02, NV03).');
      }
    } catch (error: any) {
      this.logger.error('Failed to seed default employees:', error.message);
    }
  }

  async findAll(params: { branchId?: string; isActive?: boolean }): Promise<Employee[]> {
    const { branchId, isActive } = params;
    const query = this.employeeRepository.createQueryBuilder('employee');

    if (isActive !== undefined) {
      query.andWhere('employee.isActive = :isActive', { isActive });
    }

    if (branchId) {
      query.andWhere('employee.branchId = :branchId', { branchId });
    }

    query.orderBy('employee.employeeCode', 'ASC');
    return query.getMany();
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return employee;
  }

  async findByCode(employeeCode: string, branchId?: string): Promise<Employee | null> {
    const query = this.employeeRepository.createQueryBuilder('employee')
      .where('UPPER(employee.employeeCode) = UPPER(:employeeCode)', { employeeCode });

    if (branchId) {
      query.andWhere('employee.branchId = :branchId', { branchId });
    }

    return query.getOne();
  }

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const existing = await this.employeeRepository.findOne({
      where: { employeeCode: dto.employeeCode },
    });
    if (existing) {
      throw new BadRequestException(`Employee code "${dto.employeeCode}" already exists`);
    }

    const employee = new Employee();
    employee.branchId = dto.branchId;
    employee.employeeCode = dto.employeeCode.toUpperCase();
    employee.fullName = dto.fullName;
    employee.role = dto.role || 'WAITER';
    employee.pinCode = dto.pinCode || '1234';
    employee.avatarUrl = dto.avatarUrl || null;
    employee.faceDescriptor = dto.faceDescriptor || null;
    employee.isActive = dto.isActive !== undefined ? dto.isActive : true;

    return this.employeeRepository.save(employee);
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findOne(id);

    if (dto.employeeCode && dto.employeeCode.toUpperCase() !== employee.employeeCode) {
      const existing = await this.employeeRepository.findOne({
        where: { employeeCode: dto.employeeCode.toUpperCase() },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Employee code "${dto.employeeCode}" already exists`);
      }
      employee.employeeCode = dto.employeeCode.toUpperCase();
    }

    if (dto.fullName !== undefined) employee.fullName = dto.fullName;
    if (dto.role !== undefined) employee.role = dto.role;
    if (dto.pinCode !== undefined) employee.pinCode = dto.pinCode;
    if (dto.avatarUrl !== undefined) employee.avatarUrl = dto.avatarUrl;
    if (dto.faceDescriptor !== undefined) employee.faceDescriptor = dto.faceDescriptor;
    if (dto.isActive !== undefined) employee.isActive = dto.isActive;
    if (dto.branchId !== undefined) employee.branchId = dto.branchId;

    return this.employeeRepository.save(employee);
  }

  async registerFace(id: string, descriptor: number[], avatarBase64?: string): Promise<Employee> {
    const employee = await this.findOne(id);
    if (!Array.isArray(descriptor) || descriptor.length !== 128) {
      throw new BadRequestException('Face descriptor must be an array of 128 floating point numbers');
    }

    employee.faceDescriptor = descriptor;
    if (avatarBase64) {
      employee.avatarUrl = avatarBase64;
    }

    this.logger.log(`Updated face descriptor for employee ${employee.employeeCode} (${employee.fullName})`);
    return this.employeeRepository.save(employee);
  }
}
