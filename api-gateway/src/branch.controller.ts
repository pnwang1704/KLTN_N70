import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Inject,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { Public } from './common/decorators/public.decorator';
import { Roles } from './common/decorators/roles.decorator';

const FALLBACK_BRANCHES = [
  {
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
    tables: [],
  },
  {
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
    tables: [],
  },
];

@Controller('branches')
export class BranchController {
  private readonly logger = new Logger(BranchController.name);

  constructor(
    @Inject('BRANCH_SERVICE') private readonly branchClient: ClientProxy,
  ) {}

  @Public()
  @Get()
  async getBranches() {
    try {
      return await firstValueFrom(
        this.branchClient.send({ cmd: 'get_branches' }, {}).pipe(timeout(6000)),
      );
    } catch (error: any) {
      this.logger.warn(`Fallback getBranches: ${error?.message || error}`);
      return FALLBACK_BRANCHES;
    }
  }

  @Public()
  @Get(':id')
  async getBranchById(@Param('id') id: string) {
    try {
      return await firstValueFrom(
        this.branchClient
          .send({ cmd: 'get_branch' }, { id })
          .pipe(timeout(6000)),
      );
    } catch (error: any) {
      this.logger.warn(`Fallback getBranchById(${id}): ${error?.message || error}`);
      return (
        FALLBACK_BRANCHES.find((b) => b.id === id) || FALLBACK_BRANCHES[0]
      );
    }
  }

  @Roles('ADMIN', 'MANAGER')
  @Post()
  createBranch(@Body() body: any) {
    return this.branchClient.send({ cmd: 'create_branch' }, body);
  }

  @Roles('ADMIN', 'MANAGER')
  @Put(':id')
  updateBranchPut(@Param('id') id: string, @Body() body: any) {
    return this.branchClient.send({ cmd: 'update_branch' }, { id, dto: body });
  }

  @Roles('ADMIN', 'MANAGER')
  @Patch(':id')
  updateBranchPatch(@Param('id') id: string, @Body() body: any) {
    return this.branchClient.send({ cmd: 'update_branch' }, { id, dto: body });
  }

  @Roles('ADMIN')
  @Delete(':id')
  deleteBranch(@Param('id') id: string) {
    return this.branchClient.send({ cmd: 'delete_branch' }, { id });
  }

  // --- TABLES PER BRANCH ---
  @Public()
  @Get(':id/tables')
  getBranchTables(@Param('id') branchId: string) {
    return this.branchClient.send({ cmd: 'get_branch_tables' }, { branchId });
  }

  @Roles('ADMIN', 'MANAGER')
  @Post(':id/tables')
  createBranchTable(@Param('id') branchId: string, @Body() body: any) {
    return this.branchClient.send(
      { cmd: 'create_branch_table' },
      { branchId, dto: body },
    );
  }

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Patch(':id/tables/:tableId')
  updateBranchTable(
    @Param('id') branchId: string,
    @Param('tableId') tableId: string,
    @Body() body: any,
  ) {
    return this.branchClient.send(
      { cmd: 'update_branch_table' },
      { branchId, tableId, dto: body },
    );
  }

  @Roles('ADMIN', 'MANAGER')
  @Delete(':id/tables/:tableId')
  deleteBranchTable(
    @Param('id') branchId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.branchClient.send(
      { cmd: 'delete_branch_table' },
      { branchId, tableId },
    );
  }
}
