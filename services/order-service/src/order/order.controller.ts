import { Controller, Post, Body, Patch, Delete, Param, Get, Query } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // HTTP endpoint for getting active orders of a table
  @Get('active')
  async getActiveOrdersHttp(
    @Query('branchId') branchId: string,
    @Query('tableId') tableId?: string,
  ) {
    return this.orderService.getActiveOrders({ branchId: branchId || '1', tableId });
  }

  // HTTP endpoint for processing payment for all table orders
  @Post('pay-table')
  async processTablePaymentHttp(
    @Body() body: {
      branchId: string;
      tableId: string;
      orderIds?: string[];
      paymentMethod: any;
      amountPaid: number;
    },
  ) {
    return this.orderService.processTablePayment(body);
  }

  // HTTP endpoint for creating order (e.g., from POS)
  @Post()
  async createOrderHttp(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.createOrder(createOrderDto);
  }

  // HTTP endpoint for deleting pending order
  @Delete(':id')
  async deleteOrderHttp(@Param('id') id: string) {
    return this.orderService.deleteOrder(id);
  }

  // HTTP endpoint for updating item status (e.g., from KDS)
  @Patch('item-status')
  async updateItemStatusHttp(@Body() updateItemStatusDto: UpdateItemStatusDto) {
    return this.orderService.updateItemStatus(updateItemStatusDto);
  }

  // HTTP endpoint for processing payment
  @Post(':id/pay')
  async processPaymentHttp(
    @Param('id') id: string,
    @Body() processPaymentDto: ProcessPaymentDto,
  ) {
    return this.orderService.processPayment(id, processPaymentDto);
  }

  // Message Pattern for creating order (e.g., from API Gateway)
  @MessagePattern('create_order')
  async handleCreateOrder(@Payload() createOrderDto: CreateOrderDto) {
    return this.orderService.createOrder(createOrderDto);
  }

  // Message Pattern for deleting order (e.g., from API Gateway)
  @MessagePattern('delete_order')
  async handleDeleteOrder(@Payload() id: string) {
    return this.orderService.deleteOrder(id);
  }

  // Message Pattern for updating item status
  @MessagePattern('update_item_status')
  async handleUpdateItemStatus(@Payload() updateItemStatusDto: UpdateItemStatusDto) {
    return this.orderService.updateItemStatus(updateItemStatusDto);
  }

  // Message Pattern for processing payment
  @MessagePattern('process_payment')
  async handleProcessPayment(@Payload() payload: { orderId: string; processPaymentDto: ProcessPaymentDto }) {
    return this.orderService.processPayment(payload.orderId, payload.processPaymentDto);
  }

  // Message Pattern for processing payos webhook
  @MessagePattern('process_payos_webhook')
  async handleProcessPayOSWebhook(@Payload() payload: { orderCode: number; amount: number }) {
    return this.orderService.processPaymentByOrderCode(payload.orderCode, payload.amount);
  }

  // Message Pattern for getting orders
  @MessagePattern('get_orders')
  async handleGetOrders(@Payload() payload: string | { branchId: string; fromDate?: string; toDate?: string }) {
    return this.orderService.getOrders(payload);
  }

  // HTTP endpoint for getting orders
  @Get()
  async getOrdersHttp(
    @Query('branchId') branchId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.orderService.getOrders({ branchId: branchId || '1', fromDate, toDate });
  }

  // Message Pattern for getting active orders of table
  @MessagePattern('get_active_orders')
  async handleGetActiveOrders(@Payload() payload: { branchId: string; tableId?: string }) {
    return this.orderService.getActiveOrders(payload);
  }

  // Message Pattern for paying table orders
  @MessagePattern('pay_table_orders')
  async handlePayTableOrders(@Payload() payload: {
    branchId: string;
    tableId: string;
    orderIds?: string[];
    paymentMethod: any;
    amountPaid: number;
  }) {
    return this.orderService.processTablePayment(payload);
  }

  // Message Pattern for getting shift summary
  @MessagePattern('get_shift_summary')
  async handleGetShiftSummary(@Payload() payload: {
    branchId: string;
    cashierId?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    return this.orderService.getShiftSummary(payload);
  }

  // HTTP endpoint for getting shift summary
  @Get('shift-summary')
  async getShiftSummaryHttp(
    @Query('branchId') branchId: string,
    @Query('cashierId') cashierId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.orderService.getShiftSummary({
      branchId: branchId || '1',
      cashierId,
      fromDate,
      toDate,
    });
  }
}

