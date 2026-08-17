import { Controller, Post, Patch, Body, Param, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateOrderDto, ProcessPaymentDto, UpdateItemStatusDto } from './dto/order.dto';

@Controller('orders')
export class OrderController {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
  ) {}

  @Post()
  createOrder(@Body() dto: CreateOrderDto) {
    return this.orderClient.send('create_order', dto);
  }

  @Post(':id/pay')
  processPayment(@Param('id') id: string, @Body() dto: ProcessPaymentDto) {
    return this.orderClient.send('process_payment', { orderId: id, processPaymentDto: dto });
  }

  @Patch('item-status')
  updateItemStatus(@Body() dto: UpdateItemStatusDto) {
    return this.orderClient.send('update_item_status', dto);
  }
}
