import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Order, OrderStatus, OrderType } from './entities/order.entity';
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
    const { paymentMethod, amountPaid, discountPercent, finalAmount } = processPaymentDto;
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

    if (finalAmount !== undefined) {
      order.finalAmount = Math.round(Number(finalAmount));
      if (discountPercent !== undefined && discountPercent >= 0) {
        order.discountPercent = discountPercent;
      }
    } else if (discountPercent !== undefined && discountPercent >= 0) {
      order.discountPercent = discountPercent;
      const discount = Math.round((order.totalAmount * discountPercent) / 100);
      order.finalAmount = Math.max(0, order.totalAmount - discount);
    }

    const payable = order.finalAmount !== undefined && order.finalAmount !== null ? order.finalAmount : order.totalAmount;

    if (amountPaid < payable) {
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

    if (savedOrder.tableId) {
      this.eventsGateway.emitTableCompleted(savedOrder.branchId, {
        branchId: savedOrder.branchId,
        tableId: savedOrder.tableId,
        orderId: savedOrder.id,
      });
    }

    return savedOrder;
  }

  async processPaymentByOrderCode(orderCode: number, amountPaid: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { orderCode: Number(orderCode) },
    });

    if (!order) {
      throw new NotFoundException(`Order with orderCode ${orderCode} not found`);
    }

    if (order.orderType === OrderType.AT_TABLE && order.tableId) {
      await this.processTablePayment({
        branchId: order.branchId,
        tableId: order.tableId,
        paymentMethod: 'BANK_TRANSFER',
        amountPaid,
      });
      return order;
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

  async deleteOrder(orderId: string): Promise<{ success: boolean; message: string }> {
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

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Chỉ được phép xóa đơn hàng đang ở trạng thái PENDING');
    }

    await this.orderRepository.remove(order);
    return { success: true, message: 'Đã xóa đơn hàng thành công' };
  }

  async getActiveOrders(params: { branchId: string; tableId?: string }): Promise<Order[]> {
    const { branchId, tableId } = params;
    const where: any = {
      branchId: branchId || '1',
      status: Not(In([OrderStatus.COMPLETED, OrderStatus.CANCELLED])),
    };

    if (tableId) {
      where.tableId = tableId;
    }

    return this.orderRepository.find({
      where,
      relations: {
        items: { toppings: true },
        payment: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async processTablePayment(payload: {
    branchId: string;
    tableId: string;
    orderIds?: string[];
    paymentMethod: any;
    amountPaid: number;
  }): Promise<{ success: boolean; completedOrderIds: string[] }> {
    const { branchId, tableId, orderIds, paymentMethod, amountPaid } = payload;

    let orders: Order[] = [];
    if (orderIds && orderIds.length > 0) {
      orders = await this.orderRepository.find({
        where: { id: In(orderIds), branchId },
        relations: { items: { toppings: true }, payment: true },
      });
    } else {
      orders = await this.orderRepository.find({
        where: {
          branchId,
          tableId,
          status: Not(In([OrderStatus.COMPLETED, OrderStatus.CANCELLED])),
        },
        relations: { items: { toppings: true }, payment: true },
      });
    }

    if (orders.length === 0) {
      throw new NotFoundException(`Không tìm thấy đơn hàng đang hoạt động cho bàn ${tableId}`);
    }

    const completedOrderIds: string[] = [];

    for (const order of orders) {
      order.status = OrderStatus.COMPLETED;
      if (!order.payment) {
        const payment = new Payment();
        payment.paymentMethod = paymentMethod;
        payment.amount = Number(order.finalAmount || order.totalAmount || 0);
        order.payment = payment;
      } else {
        order.payment.paymentMethod = paymentMethod;
        order.payment.amount = Number(order.finalAmount || order.totalAmount || 0);
      }

      await this.orderRepository.save(order);
      completedOrderIds.push(order.id);

      // Emit event to inventory service via RabbitMQ
      const invPayload = {
        orderId: order.id,
        branchId: order.branchId,
        items: order.items?.map(item => ({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
          toppings: item.toppings?.map(t => ({
            toppingId: t.toppingId,
            quantity: t.quantity
          })) || []
        })) || []
      };
      this.inventoryClient.emit('order.completed', invPayload);

      // Emit event to frontend via Socket.IO
      this.eventsGateway.emitOrderPaid(order.branchId, {
        orderId: order.id,
        status: OrderStatus.COMPLETED
      });
    }

    // Emit table:completed event via Socket.IO
    this.eventsGateway.emitTableCompleted(branchId, {
      branchId,
      tableId,
      orderId: completedOrderIds[0],
      orderIds: completedOrderIds,
    });

    return { success: true, completedOrderIds };
  }
}

