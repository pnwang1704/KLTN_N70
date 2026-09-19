import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Order, OrderStatus, OrderType } from './entities/order.entity';
import { OrderItem, ItemStatus } from './entities/order-item.entity';
import { OrderItemTopping } from './entities/order-item-topping.entity';
import { Payment, PaymentMethod } from './entities/payment.entity';
import { Expense } from './entities/expense.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
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

    if (processPaymentDto.cashierId) {
      order.cashierId = processPaymentDto.cashierId;
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

  async getOrders(params: string | { branchId: string; fromDate?: string; toDate?: string }): Promise<Order[]> {
    const branchId = typeof params === 'string' ? params : (params.branchId || '1');
    const fromDate = typeof params === 'object' ? params.fromDate : undefined;
    const toDate = typeof params === 'object' ? params.toDate : undefined;

    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.toppings', 'toppings')
      .leftJoinAndSelect('order.payment', 'payment')
      .where('order.branchId = :branchId', { branchId });

    if (fromDate) {
      query.andWhere('order.createdAt >= :fromDate', { fromDate: new Date(fromDate) });
    }

    if (toDate) {
      query.andWhere('order.createdAt <= :toDate', { toDate: new Date(toDate) });
    }

    query.orderBy('order.createdAt', 'DESC');

    return query.getMany();
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
    cashierId?: string;
  }): Promise<{ success: boolean; completedOrderIds: string[] }> {
    const { branchId, tableId, orderIds, paymentMethod, amountPaid, cashierId } = payload;

    let orders: Order[] = [];
    if (orderIds && orderIds.length > 0) {
      orders = await this.orderRepository.find({
        where: { id: In(orderIds), branchId },
        relations: { items: { toppings: true }, payment: true },
        order: { createdAt: 'ASC' },
      });
    } else {
      orders = await this.orderRepository.find({
        where: {
          branchId,
          tableId,
          status: Not(In([OrderStatus.COMPLETED, OrderStatus.CANCELLED])),
        },
        relations: { items: { toppings: true }, payment: true },
        order: { createdAt: 'ASC' },
      });
    }

    if (orders.length === 0) {
      throw new NotFoundException(`Không tìm thấy đơn hàng đang hoạt động cho bàn ${tableId}`);
    }

    // If table has multiple orders (e.g. 2 or more rounds from customer-web),
    // merge them into 1 single consolidated Order in the database so order history only shows 1 bill!
    if (orders.length > 1) {
      const primaryOrder = orders[0];
      const otherOrders = orders.slice(1);

      // Reassign all items from subsequent orders to primaryOrder
      for (const otherOrder of otherOrders) {
        if (otherOrder.items && otherOrder.items.length > 0) {
          for (const item of otherOrder.items) {
            item.order = primaryOrder;
            await this.orderItemRepository.save(item);
          }
        }
      }

      // Delete other orders from DB (items are already reassigned)
      for (const otherOrder of otherOrders) {
        await this.orderRepository.delete(otherOrder.id);
      }

      // Reload primaryOrder with all items and toppings
      const updatedPrimaryOrder = await this.orderRepository.findOne({
        where: { id: primaryOrder.id },
        relations: { items: { toppings: true }, payment: true },
      });

      if (!updatedPrimaryOrder) {
        throw new NotFoundException('Primary order not found');
      }

      const combinedTotal = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      const combinedFinal = orders.reduce((sum, o) => sum + Number(o.finalAmount || o.totalAmount || 0), 0);

      updatedPrimaryOrder.totalAmount = combinedTotal;
      updatedPrimaryOrder.finalAmount = combinedFinal;
      updatedPrimaryOrder.status = OrderStatus.COMPLETED;

      if (!updatedPrimaryOrder.payment) {
        const payment = new Payment();
        payment.paymentMethod = paymentMethod;
        payment.amount = amountPaid;
        updatedPrimaryOrder.payment = payment;
      } else {
        updatedPrimaryOrder.payment.paymentMethod = paymentMethod;
        updatedPrimaryOrder.payment.amount = amountPaid;
      }

      if (cashierId) {
        updatedPrimaryOrder.cashierId = cashierId;
      }

      await this.orderRepository.save(updatedPrimaryOrder);

      // Emit event to inventory service via RabbitMQ
      const invPayload = {
        orderId: updatedPrimaryOrder.id,
        branchId: updatedPrimaryOrder.branchId,
        items: updatedPrimaryOrder.items?.map(item => ({
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
      this.eventsGateway.emitOrderPaid(updatedPrimaryOrder.branchId, {
        orderId: updatedPrimaryOrder.id,
        status: OrderStatus.COMPLETED
      });

      // Emit table:completed event via Socket.IO
      this.eventsGateway.emitTableCompleted(branchId, {
        branchId,
        tableId,
        orderId: updatedPrimaryOrder.id,
        orderIds: [updatedPrimaryOrder.id],
      });

      return { success: true, completedOrderIds: [updatedPrimaryOrder.id] };
    }

    // Single order case
    const order = orders[0];
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

    if (cashierId) {
      order.cashierId = cashierId;
    }

    await this.orderRepository.save(order);

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

    // Emit table:completed event via Socket.IO
    this.eventsGateway.emitTableCompleted(branchId, {
      branchId,
      tableId,
      orderId: order.id,
      orderIds: [order.id],
    });

    return { success: true, completedOrderIds: [order.id] };
  }

  async createExpense(createExpenseDto: CreateExpenseDto): Promise<Expense> {
    const expense = this.expenseRepository.create({
      branchId: createExpenseDto.branchId,
      cashierId: createExpenseDto.cashierId,
      amount: createExpenseDto.amount,
      reason: createExpenseDto.reason,
      note: createExpenseDto.note,
    });
    return this.expenseRepository.save(expense);
  }

  async getExpenses(params: {
    branchId: string;
    cashierId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<Expense[]> {
    const { branchId, cashierId, fromDate, toDate } = params;
    const query = this.expenseRepository
      .createQueryBuilder('expense')
      .where('expense.branchId = :branchId', { branchId })
      .orderBy('expense.createdAt', 'DESC');

    if (fromDate) {
      query.andWhere('expense.createdAt >= :fromDate', { fromDate: new Date(fromDate) });
    }
    if (toDate) {
      query.andWhere('expense.createdAt <= :toDate', { toDate: new Date(toDate) });
    }
    if (cashierId) {
      query.andWhere('(expense.cashierId = :cashierId OR expense.cashierId IS NULL)', { cashierId });
    }

    return query.getMany();
  }

  async getShiftSummary(params: {
    branchId: string;
    cashierId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<{
    totalRevenue: number;
    totalCash: number;
    totalBankTransfer: number;
    totalExpense: number;
    totalOrders: number;
    cashierId?: string;
    date: string;
    expenses: Array<{
      id: string;
      branchId: string;
      cashierId: string;
      amount: number;
      reason: string;
      note?: string;
      createdAt: Date;
    }>;
    recentOrders: Array<{
      id: string;
      orderCode: number;
      tableId?: string;
      orderType: OrderType;
      finalAmount: number;
      paymentMethod?: string;
      createdAt: Date;
    }>;
  }> {
    const { branchId, cashierId, fromDate, toDate } = params;

    let startDate: Date;
    if (fromDate) {
      startDate = new Date(fromDate);
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    }

    let endDate: Date;
    if (toDate) {
      endDate = new Date(toDate);
    } else {
      endDate = new Date();
    }

    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.payment', 'payment')
      .where('order.branchId = :branchId', { branchId })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .andWhere('order.createdAt <= :endDate', { endDate })
      .orderBy('order.createdAt', 'DESC');

    if (cashierId) {
      query.andWhere('(order.cashierId = :cashierId OR order.cashierId IS NULL)', { cashierId });
    }

    const orders = await query.getMany();

    let totalRevenue = 0;
    let totalCash = 0;
    let totalBankTransfer = 0;

    for (const order of orders) {
      const amount = Number(
        order.finalAmount !== undefined && order.finalAmount !== null
          ? order.finalAmount
          : (order.totalAmount || 0),
      );
      totalRevenue += amount;

      const method = order.payment?.paymentMethod;
      if (method === PaymentMethod.CASH || (method as string) === 'CASH') {
        totalCash += amount;
      } else if (method === PaymentMethod.BANK_TRANSFER || (method as string) === 'BANK_TRANSFER') {
        totalBankTransfer += amount;
      } else {
        totalCash += amount;
      }
    }

    // Query expenses in the shift period
    const expenseQuery = this.expenseRepository
      .createQueryBuilder('expense')
      .where('expense.branchId = :branchId', { branchId })
      .andWhere('expense.createdAt >= :startDate', { startDate })
      .andWhere('expense.createdAt <= :endDate', { endDate })
      .orderBy('expense.createdAt', 'DESC');

    if (cashierId) {
      expenseQuery.andWhere('(expense.cashierId = :cashierId OR expense.cashierId IS NULL)', { cashierId });
    }

    const expenses = await expenseQuery.getMany();
    const totalExpense = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

    return {
      totalRevenue,
      totalCash,
      totalBankTransfer,
      totalExpense,
      totalOrders: orders.length,
      cashierId,
      date: new Date().toISOString().split('T')[0],
      expenses: expenses.map(e => ({
        id: e.id,
        branchId: e.branchId,
        cashierId: e.cashierId,
        amount: Number(e.amount),
        reason: e.reason,
        note: e.note,
        createdAt: e.createdAt,
      })),
      recentOrders: orders.map(o => ({
        id: o.id,
        orderCode: o.orderCode,
        tableId: o.tableId,
        orderType: o.orderType,
        finalAmount: Number(
          o.finalAmount !== undefined && o.finalAmount !== null
            ? o.finalAmount
            : (o.totalAmount || 0),
        ),
        paymentMethod: o.payment?.paymentMethod,
        createdAt: o.createdAt,
      })),
    };
  }
}


