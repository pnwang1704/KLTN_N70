import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem, ItemStatus } from './entities/order-item.entity';
import { OrderItemTopping } from './entities/order-item-topping.entity';
import { Payment } from './entities/payment.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    private eventsGateway: EventsGateway,
    @Inject('INVENTORY_SERVICE') private inventoryClient: ClientProxy,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const { items, paymentMethod, ...orderData } = createOrderDto;

    const order = this.orderRepository.create({
      ...orderData,
      orderCode: Date.now(), // Generate PayOS orderCode
      items: items.map(item => {
        const orderItem = new OrderItem();
        orderItem.productId = item.productId;
        orderItem.productName = item.productName;
        orderItem.size = item.size as string;
        orderItem.quantity = item.quantity;
        orderItem.unitPrice = item.unitPrice;
        orderItem.note = item.note as string;
        orderItem.toppings = item.toppings?.map(t => {
          const topping = new OrderItemTopping();
          topping.toppingId = t.toppingId;
          topping.toppingName = t.toppingName;
          topping.price = t.price;
          topping.quantity = t.quantity;
          return topping;
        }) || [];
        return orderItem;
      }),
    });

    if (paymentMethod) {
      const payment = new Payment();
      payment.paymentMethod = paymentMethod;
      payment.amount = orderData.finalAmount;
      order.payment = payment;
    }

    const savedOrder = await this.orderRepository.save(order);
    
    // Phát sự kiện Socket.IO tới KDS của chi nhánh
    this.eventsGateway.emitNewOrder(savedOrder.branchId, savedOrder);

    //TODO: Gửi message tới Inventory Service và Reporting Service qua RabbitMQ (có thể emit từ Gateway/Controller)

    return savedOrder;
  }

  async updateItemStatus(updateItemStatusDto: UpdateItemStatusDto): Promise<OrderItem> {
    const { orderItemId, itemStatus } = updateItemStatusDto;
    const item = await this.orderItemRepository.findOne({ 
      where: { id: orderItemId },
      relations: { order: true }
    });

    if (!item) {
      throw new NotFoundException('Order item not found');
    }

    item.itemStatus = itemStatus;
    const savedItem = await this.orderItemRepository.save(item);

    // Nếu món ăn đã hoàn thành, báo cho POS
    if (itemStatus === ItemStatus.COMPLETED) {
      this.eventsGateway.emitItemReady(item.order.branchId, savedItem);
    }

    return savedItem;
  }

  async processPayment(orderId: string, processPaymentDto: ProcessPaymentDto): Promise<Order> {
    const { paymentMethod, amountPaid } = processPaymentDto;
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: {
        items: { toppings: true },
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException('Order is already completed or cancelled');
    }

    if (amountPaid < order.totalAmount) {
      throw new BadRequestException('Amount paid is less than total amount');
    }

    order.status = OrderStatus.COMPLETED;

    if (!order.payment) {
      const payment = new Payment();
      payment.paymentMethod = paymentMethod;
      payment.amount = amountPaid;
      order.payment = payment;
    } else {
      order.payment.paymentMethod = paymentMethod;
      order.payment.amount = amountPaid;
    }

    const savedOrder = await this.orderRepository.save(order);

    // Emit event to inventory service via RabbitMQ
    const payload = {
      orderId: savedOrder.id,
      branchId: savedOrder.branchId,
      items: savedOrder.items.map(item => ({
        productId: item.productId,
        size: item.size,
        quantity: item.quantity,
        toppings: item.toppings?.map(t => ({
          toppingId: t.toppingId,
          quantity: t.quantity
        })) || []
      }))
    };
    
    this.inventoryClient.emit('order.completed', payload);

    // Emit event to frontend via Socket.IO
    this.eventsGateway.emitOrderPaid(savedOrder.branchId, {
      orderId: savedOrder.id,
      status: OrderStatus.COMPLETED
    });

    return savedOrder;
  }

  async processPaymentByOrderCode(orderCode: number, amountPaid: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { orderCode: Number(orderCode) },
    });

    if (!order) {
      throw new NotFoundException(`Order with orderCode ${orderCode} not found`);
    }

    return this.processPayment(order.id, {
      paymentMethod: 'BANK_TRANSFER' as any,
      amountPaid
    });
  }

  async getOrders(branchId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { branchId },
      relations: {
        items: { toppings: true },
        payment: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }
}
