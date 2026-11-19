import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { BranchTable, TableStatus } from './entities/branch-table.entity';

@Injectable()
export class BranchService implements OnModuleInit {
  private readonly logger = new Logger(BranchService.name);

  constructor(
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(BranchTable)
    private readonly tableRepo: Repository<BranchTable>,
  ) {}

  async onModuleInit() {
    await this.seedInitialData();
  }

  async seedInitialData() {
    try {
      const count = await this.branchRepo.count();
      if (count > 0) {
        this.logger.log(`branch_db already has ${count} branches, skipping default seed.`);
        return;
      }

      this.logger.log('Seeding 2 default branches & 16 tables into branch_db...');

      const branch1 = this.branchRepo.create({
        id: '1',
        code: 'CN01',
        name: 'Chi nhánh 1 - Quận 1',
        address: '12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
        phone: '0901.234.567',
        openTime: '07:00',
        closeTime: '22:30',
        wifiName: 'N70_Quan1_Free',
        wifiPassword: '12345678',
        isActive: true,
      });

      const branch2 = this.branchRepo.create({
        id: '2',
        code: 'CN02',
        name: 'Chi nhánh 2 - Bình Thạnh',
        address: '125 Điện Biên Phủ, Quận Bình Thạnh, TP.HCM',
        phone: '0909.888.777',
        openTime: '07:30',
        closeTime: '22:00',
        wifiName: 'N70_BinhThanh_Free',
        wifiPassword: '88888888',
        isActive: true,
      });

      await this.branchRepo.save([branch1, branch2]);

      const defaultTablesB1 = [
        { branchId: '1', tableNumber: '1', name: 'Bàn 01', area: 'Tầng 1', capacity: 2, status: TableStatus.AVAILABLE },
        { branchId: '1', tableNumber: '2', name: 'Bàn 02', area: 'Tầng 1', capacity: 4, status: TableStatus.AVAILABLE },
        { branchId: '1', tableNumber: '3', name: 'Bàn 03', area: 'Tầng 1', capacity: 4, status: TableStatus.AVAILABLE },
        { branchId: '1', tableNumber: '4', name: 'Bàn 04', area: 'Tầng 1', capacity: 6, status: TableStatus.AVAILABLE },
        { branchId: '1', tableNumber: '5', name: 'Bàn 05', area: 'Tầng 2', capacity: 4, status: TableStatus.AVAILABLE },
        { branchId: '1', tableNumber: '6', name: 'Bàn 06', area: 'Tầng 2', capacity: 4, status: TableStatus.AVAILABLE },
        { branchId: '1', tableNumber: '7', name: 'Bàn 07', area: 'Sân vườn', capacity: 4, status: TableStatus.AVAILABLE },
        { branchId: '1', tableNumber: '8', name: 'Bàn 08', area: 'Sân vườn', capacity: 6, status: TableStatus.AVAILABLE },
      ];

      const defaultTablesB2 = [
        { branchId: '2', tableNumber: '1', name: 'Bàn 01', area: 'Tầng trệt', capacity: 2, status: TableStatus.AVAILABLE },
        { branchId: '2', tableNumber: '2', name: 'Bàn 02', area: 'Tầng trệt', capacity: 4, status: TableStatus.AVAILABLE },
        { branchId: '2', tableNumber: '3', name: 'Bàn 03', area: 'Tầng trệt', capacity: 4, status: TableStatus.AVAILABLE },
        { branchId: '2', tableNumber: '4', name: 'Bàn 04', area: 'Lầu 1', capacity: 4, status: TableStatus.AVAILABLE },
        { branchId: '2', tableNumber: '5', name: 'Bàn 05', area: 'Lầu 1', capacity: 6, status: TableStatus.AVAILABLE },
        { branchId: '2', tableNumber: '6', name: 'Bàn 06', area: 'Sân thượng', capacity: 4, status: TableStatus.AVAILABLE },
        { branchId: '2', tableNumber: '7', name: 'Bàn 07', area: 'Sân thượng', capacity: 6, status: TableStatus.AVAILABLE },
        { branchId: '2', tableNumber: '8', name: 'Bàn 08', area: 'Sân thượng', capacity: 8, status: TableStatus.AVAILABLE },
      ];

      await this.tableRepo.save([...defaultTablesB1, ...defaultTablesB2]);
      this.logger.log('Seeded 2 branches and 16 branch_tables successfully!');
    } catch (error: any) {
      this.logger.error('Failed to seed branch_db', error?.stack || error);
    }
  }

  async getBranches(): Promise<Branch[]> {
    return this.branchRepo.find({
      relations: { tables: true },
      order: { code: 'ASC' },
    });
  }

  async getBranchById(id: string): Promise<Branch> {
    const branch = await this.branchRepo.findOne({
      where: { id },
      relations: { tables: true },
    });
    if (!branch) {
      throw new NotFoundException(`Không tìm thấy chi nhánh #${id}`);
    }
    return branch;
  }

  async createBranch(dto: Partial<Branch>): Promise<Branch> {
    const all = await this.branchRepo.find();
    const numericIds = all
      .map((b) => parseInt(b.id, 10))
      .filter((n) => !Number.isNaN(n));
    const nextNum = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;

    const newId = dto.id?.trim() || String(nextNum);
    const newCode =
      dto.code?.trim().toUpperCase() || `CN${String(nextNum).padStart(2, '0')}`;

    const branch = this.branchRepo.create({
      id: newId,
      code: newCode,
      name: dto.name || `Chi nhánh ${nextNum}`,
      address: dto.address || '',
      phone: dto.phone || '',
      openTime: dto.openTime || '07:00',
      closeTime: dto.closeTime || '22:00',
      wifiName: dto.wifiName || `N70_${newCode}_Free`,
      wifiPassword: dto.wifiPassword || '12345678',
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    const saved = await this.branchRepo.save(branch);

    // Tự động khởi tạo 6 bàn mẫu cho chi nhánh mới
    const starterTables = Array.from({ length: 6 }, (_, i) =>
      this.tableRepo.create({
        branchId: saved.id,
        tableNumber: String(i + 1),
        name: `Bàn ${String(i + 1).padStart(2, '0')}`,
        area: i < 4 ? 'Tầng 1' : 'Sân vườn',
        capacity: 4,
        status: TableStatus.AVAILABLE,
      }),
    );
    await this.tableRepo.save(starterTables);

    return this.getBranchById(saved.id);
  }

  async updateBranch(id: string, dto: Partial<Branch>): Promise<Branch> {
    const existing = await this.branchRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy chi nhánh #${id}`);
    }

    if (dto.code !== undefined) existing.code = dto.code.trim().toUpperCase();
    if (dto.name !== undefined) existing.name = dto.name;
    if (dto.address !== undefined) existing.address = dto.address;
    if (dto.phone !== undefined) existing.phone = dto.phone;
    if (dto.openTime !== undefined) existing.openTime = dto.openTime;
    if (dto.closeTime !== undefined) existing.closeTime = dto.closeTime;
    if (dto.wifiName !== undefined) existing.wifiName = dto.wifiName;
    if (dto.wifiPassword !== undefined) existing.wifiPassword = dto.wifiPassword;
    if (dto.isActive !== undefined) existing.isActive = Boolean(dto.isActive);

    await this.branchRepo.save(existing);
    return this.getBranchById(id);
  }

  async deleteBranch(id: string): Promise<{ success: boolean; id: string }> {
    const existing = await this.branchRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy chi nhánh #${id}`);
    }
    await this.branchRepo.delete(id);
    return { success: true, id };
  }

  // --- TABLES PER BRANCH ---
  async getTablesByBranch(branchId: string): Promise<BranchTable[]> {
    const tables = await this.tableRepo.find({
      where: { branchId },
    });
    return tables.sort((a, b) => {
      const numA = parseInt(a.tableNumber || a.name.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.tableNumber || b.name.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });
  }

  async createTable(
    branchId: string,
    dto: Partial<BranchTable>,
  ): Promise<BranchTable> {
    await this.getBranchById(branchId);
    const existingTables = await this.getTablesByBranch(branchId);
    const nums = existingTables
      .map((t) => parseInt(t.tableNumber || t.name.replace(/\D/g, '') || '0', 10))
      .filter((n) => !Number.isNaN(n));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;

    const tableNum = dto.tableNumber?.trim() || String(nextNum);
    const table = this.tableRepo.create({
      branchId,
      tableNumber: tableNum,
      name: dto.name?.trim() || `Bàn ${String(nextNum).padStart(2, '0')}`,
      area: dto.area?.trim() || 'Tầng 1',
      capacity: Number(dto.capacity || 4),
      status: dto.status || TableStatus.AVAILABLE,
    });

    return this.tableRepo.save(table);
  }

  async updateTable(
    branchId: string,
    tableId: string,
    dto: Partial<BranchTable>,
  ): Promise<BranchTable> {
    const table = await this.tableRepo.findOne({
      where: { id: tableId, branchId },
    });
    if (!table) {
      throw new NotFoundException(`Không tìm thấy bàn #${tableId} tại chi nhánh #${branchId}`);
    }

    if (dto.name !== undefined) table.name = dto.name;
    if (dto.tableNumber !== undefined) table.tableNumber = dto.tableNumber;
    if (dto.area !== undefined) table.area = dto.area;
    if (dto.capacity !== undefined) table.capacity = Number(dto.capacity);
    if (dto.status !== undefined) table.status = dto.status;

    return this.tableRepo.save(table);
  }

  async deleteTable(
    branchId: string,
    tableId: string,
  ): Promise<{ success: boolean; id: string }> {
    const table = await this.tableRepo.findOne({
      where: { id: tableId, branchId },
    });
    if (!table) {
      throw new NotFoundException(`Không tìm thấy bàn #${tableId}`);
    }
    await this.tableRepo.delete(tableId);
    return { success: true, id: tableId };
  }
}
