import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Inject, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Roles } from './common/decorators/roles.decorator';
import { Public } from './common/decorators/public.decorator';
import { CreateOrderDto, ProcessPaymentDto, UpdateItemStatusDto } from './dto/order.dto';

@Controller('orders')
export class OrderController {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
  ) {}

  @Public()
  @Post()
  createOrder(@Body() dto: CreateOrderDto) {
    return this.orderClient.send('create_order', dto);
  }

  @Roles('CASHIER', 'ADMIN')
  @Post(':id/pay')
  processPayment(@Param('id') id: string, @Body() dto: ProcessPaymentDto, @Req() req: any) {
    const cashierId = req.user?.sub || req.user?.id;
    return this.orderClient.send('process_payment', { orderId: id, processPaymentDto: { ...dto, cashierId } });
  }

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Delete(':id')
  deleteOrder(@Param('id') id: string) {
    return this.orderClient.send('delete_order', id);
  }

  @Patch('item-status')
  updateItemStatus(@Body() dto: UpdateItemStatusDto) {
    return this.orderClient.send('update_item_status', dto);
  }

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Get('shift-summary')
  getShiftSummary(
    @Req() req: any,
    @Query('branchId') queryBranchId?: string,
    @Query('cashierId') queryCashierId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const user = req.user;
    const branchId = queryBranchId || user?.branchId || '1';
    const cashierId = queryCashierId !== undefined ? queryCashierId : (user?.sub || user?.id);
    const startDate = from || fromDate;
    const endDate = to || toDate;
    return this.orderClient.send('get_shift_summary', {
      branchId,
      cashierId,
      fromDate: startDate,
      toDate: endDate,
    });
  }

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Get()
  getOrders(@Query('branchId') branchId: string) {
    return this.orderClient.send('get_orders', branchId || '1');
  }

  @Public()
  @Get('active')
  getActiveOrders(
    @Query('branchId') branchId: string,
    @Query('tableId') tableId?: string,
  ) {
    return this.orderClient.send('get_active_orders', { branchId: branchId || '1', tableId });
  }

  @Roles('CASHIER', 'ADMIN')
  @Post('pay-table')
  processTablePayment(
    @Body() body: {
      branchId: string;
      tableId: string;
      orderIds?: string[];
      paymentMethod: any;
      amountPaid: number;
      cashierId?: string;
    },
    @Req() req: any,
  ) {
    const cashierId = body.cashierId || req.user?.sub || req.user?.id;
    return this.orderClient.send('pay_table_orders', { ...body, cashierId });
  }
}

