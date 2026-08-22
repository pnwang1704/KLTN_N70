import { Controller, Post, Body, Patch, Param } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // HTTP endpoint for creating order (e.g., from POS)
  @Post()
  async createOrderHttp(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.createOrder(createOrderDto);
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

  // Message Pattern for getting orders
  @MessagePattern('get_orders')
  async handleGetOrders(@Payload() branchId: string) {
    return this.orderService.getOrders(branchId);
  }
}
