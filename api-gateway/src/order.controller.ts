import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Inject, Req } from '@nestjs/common';
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

  @Roles('CASHIER', 'ADMIN', 'MANAGER')
  @Post(':id/pay')
  processPayment(@Param('id') id: string, @Body() dto: ProcessPaymentDto, @Req() req: any) {
    const cashierId = req.user?.sub || req.user?.id;
    return this.orderClient.send('process_payment', { orderId: id, processPaymentDto: { ...dto, cashierId } });
  }

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Put(':id/items')
  updateOrderItemsPut(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const updatedBy = body?.updatedBy || req.user?.fullName || req.user?.username || req.user?.sub;
    return this.orderClient.send('update_order_items', {
      orderId: id,
      data: { ...body, updatedBy },
    });
  }

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Patch(':id/items')
  updateOrderItemsPatch(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const updatedBy = body?.updatedBy || req.user?.fullName || req.user?.username || req.user?.sub;
    return this.orderClient.send('update_order_items', {
      orderId: id,
      data: { ...body, updatedBy },
    });
  }

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Patch(':id/cancel')
  cancelUnpaidOrder(
    @Param('id') id: string,
    @Body() body: { cancelReason: string; cancelledBy?: string },
    @Req() req: any,
  ) {
    const cancelledBy =
      body?.cancelledBy || req.user?.fullName || req.user?.username || req.user?.sub || 'Thu ngân';
    return this.orderClient.send('cancel_unpaid_order', {
      orderId: id,
      cancelReason: body?.cancelReason,
      cancelledBy,
    });
  }

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Patch(':id/void')
  voidPaidOrder(
    @Param('id') id: string,
    @Body() body: { cancelReason: string; cancelledBy?: string; managerPin: string },
    @Req() req: any,
  ) {
    const cancelledBy =
      body?.cancelledBy || req.user?.fullName || req.user?.username || req.user?.sub || 'Quản lý';
    return this.orderClient.send('void_paid_order', {
      orderId: id,
      cancelReason: body?.cancelReason,
      cancelledBy,
      managerPin: body?.managerPin,
    });
  }

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Patch(':id/payment-method')
  updateOrderPaymentMethod(
    @Param('id') id: string,
    @Body() body: { paymentMethod: string; updatedBy?: string },
    @Req() req: any,
  ) {
    const updatedBy =
      body?.updatedBy || req.user?.fullName || req.user?.username || req.user?.sub;
    return this.orderClient.send('update_order_payment_method', {
      orderId: id,
      paymentMethod: body?.paymentMethod,
      updatedBy,
    });
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
  @Patch(':id')
  updateOrderGeneric(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const updatedBy = body?.updatedBy || req.user?.fullName || req.user?.username || req.user?.sub;
    return this.orderClient.send('update_order_items', {
      orderId: id,
      data: { ...body, updatedBy },
    });
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
  getOrders(
    @Req() req: any,
    @Query('branchId') queryBranchId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('status') status?: string,
    @Query('tableId') tableId?: string,
    @Query('paymentMethod') paymentMethod?: string,
  ) {
    const branchId = queryBranchId || req.user?.branchId || '1';
    return this.orderClient.send('get_orders', {
      branchId,
      fromDate,
      toDate,
      status,
      tableId,
      paymentMethod,
    });
  }

  @Public()
  @Get('active')
  getActiveOrders(
    @Query('branchId') branchId: string,
    @Query('tableId') tableId?: string,
  ) {
    return this.orderClient.send('get_active_orders', { branchId: branchId || '1', tableId });
  }

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Get('qr-pending')
  getPendingQrOrders(@Req() req: any, @Query('branchId') queryBranchId?: string) {
    const branchId = queryBranchId || req.user?.branchId || '1';
    return this.orderClient.send('get_pending_qr_orders', { branchId });
  }

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Post(':id/confirm-qr')
  confirmQrOrder(@Param('id') id: string, @Req() req: any) {
    const cashierId = req.user?.sub || req.user?.id;
    return this.orderClient.send('confirm_qr_order', { orderId: id, cashierId });
  }

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Post(':id/reject-qr')
  rejectQrOrder(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    const cashierId = req.user?.sub || req.user?.id;
    return this.orderClient.send('reject_qr_order', {
      orderId: id,
      cashierId,
      reason: body?.reason,
    });
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

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Post('expenses')
  createExpense(@Body() body: any, @Req() req: any) {
    const cashierId = body.cashierId || req.user?.sub || req.user?.id;
    const branchId = body.branchId || req.user?.branchId || '1';
    return this.orderClient.send('create_expense', {
      ...body,
      cashierId,
      branchId,
    });
  }

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Get('expenses')
  getExpenses(
    @Req() req: any,
    @Query('branchId') queryBranchId?: string,
    @Query('cashierId') queryCashierId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const branchId = queryBranchId || req.user?.branchId || '1';
    const cashierId = queryCashierId !== undefined ? queryCashierId : (req.user?.sub || req.user?.id);
    const startDate = fromDate || from;
    const endDate = toDate || to;
    return this.orderClient.send('get_expenses', {
      branchId,
      cashierId,
      fromDate: startDate,
      toDate: endDate,
    });
  }
}

