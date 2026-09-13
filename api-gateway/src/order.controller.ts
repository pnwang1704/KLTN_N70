import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Inject } from '@nestjs/common';
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
  processPayment(@Param('id') id: string, @Body() dto: ProcessPaymentDto) {
    return this.orderClient.send('process_payment', { orderId: id, processPaymentDto: dto });
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
    },
  ) {
    return this.orderClient.send('pay_table_orders', body);
  }
}

