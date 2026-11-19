import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BranchService } from './branch.service';

@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  // --- HTTP Endpoints ---
  @Get()
  getBranchesHttp() {
    return this.branchService.getBranches();
  }

  @Get(':id')
  getBranchByIdHttp(@Param('id') id: string) {
    return this.branchService.getBranchById(id);
  }

  @Post()
  createBranchHttp(@Body() body: any) {
    return this.branchService.createBranch(body);
  }

  @Put(':id')
  updateBranchPutHttp(@Param('id') id: string, @Body() body: any) {
    return this.branchService.updateBranch(id, body);
  }

  @Patch(':id')
  updateBranchPatchHttp(@Param('id') id: string, @Body() body: any) {
    return this.branchService.updateBranch(id, body);
  }

  @Delete(':id')
  deleteBranchHttp(@Param('id') id: string) {
    return this.branchService.deleteBranch(id);
  }

  @Get(':id/tables')
  getTablesHttp(@Param('id') branchId: string) {
    return this.branchService.getTablesByBranch(branchId);
  }

  @Post(':id/tables')
  createTableHttp(@Param('id') branchId: string, @Body() body: any) {
    return this.branchService.createTable(branchId, body);
  }

  @Patch(':id/tables/:tableId')
  updateTableHttp(
    @Param('id') branchId: string,
    @Param('tableId') tableId: string,
    @Body() body: any,
  ) {
    return this.branchService.updateTable(branchId, tableId, body);
  }

  @Delete(':id/tables/:tableId')
  deleteTableHttp(
    @Param('id') branchId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.branchService.deleteTable(branchId, tableId);
  }

  // --- RabbitMQ RPC Message Patterns ---
  @MessagePattern({ cmd: 'get_branches' })
  handleGetBranches() {
    return this.branchService.getBranches();
  }

  @MessagePattern({ cmd: 'get_branch' })
  handleGetBranch(@Payload() payload: { id: string }) {
    return this.branchService.getBranchById(payload.id);
  }

  @MessagePattern({ cmd: 'create_branch' })
  handleCreateBranch(@Payload() dto: any) {
    return this.branchService.createBranch(dto);
  }

  @MessagePattern({ cmd: 'update_branch' })
  handleUpdateBranch(@Payload() payload: { id: string; dto: any }) {
    return this.branchService.updateBranch(payload.id, payload.dto);
  }

  @MessagePattern({ cmd: 'delete_branch' })
  handleDeleteBranch(@Payload() payload: { id: string }) {
    return this.branchService.deleteBranch(payload.id);
  }

  @MessagePattern({ cmd: 'get_branch_tables' })
  handleGetTables(@Payload() payload: { branchId: string }) {
    return this.branchService.getTablesByBranch(payload.branchId);
  }

  @MessagePattern({ cmd: 'create_branch_table' })
  handleCreateTable(@Payload() payload: { branchId: string; dto: any }) {
    return this.branchService.createTable(payload.branchId, payload.dto);
  }

  @MessagePattern({ cmd: 'update_branch_table' })
  handleUpdateTable(
    @Payload() payload: { branchId: string; tableId: string; dto: any },
  ) {
    return this.branchService.updateTable(
      payload.branchId,
      payload.tableId,
      payload.dto,
    );
  }

  @MessagePattern({ cmd: 'delete_branch_table' })
  handleDeleteTable(@Payload() payload: { branchId: string; tableId: string }) {
    return this.branchService.deleteTable(payload.branchId, payload.tableId);
  }
}
