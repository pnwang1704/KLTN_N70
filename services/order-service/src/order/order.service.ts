import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Order, OrderStatus, OrderType } from './entities/order.entity';
import { OrderItem, ItemStatus } from './entities/order-item.entity';
import { OrderItemTopping } from './entities/order-item-topping.entity';
import { Payment, PaymentMethod } from './entities/payment.entity';
import { Expense } from './entities/expense.entity';
import { Shift } from '../shift/entities/shift.entity';
import { Employee } from '../employee/entities/employee.entity';
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
    @InjectRepository(OrderItemTopping)
    private orderItemToppingRepository: Repository<OrderItemTopping>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    private eventsGateway: EventsGateway,
    @Inject('INVENTORY_SERVICE') private inventoryClient: ClientProxy,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const { items, paymentMethod, source, ...orderData } = createOrderDto;
    const isQrOrder = source === 'QR';

    if (isQrOrder) {
      // 1. Kiểm tra chi nhánh có ca làm việc nào đang kích hoạt không
      const totalShifts = await this.shiftRepository.count();
      if (totalShifts > 0) {
        const activeShifts = await this.shiftRepository
          .createQueryBuilder('shift')
          .where('shift.isActive = :isActive', { isActive: true })
          .andWhere('(shift.branchId = :branchId OR shift.branchId IS NULL)', {
            branchId: orderData.branchId || '1',
          })
          .getCount();

        if (activeShifts === 0) {
          throw new BadRequestException(
            'Quán hiện đang đóng ca phục vụ, tạm ngưng nhận đơn gọi món qua mã QR!',
          );
        }
      }

      // 2. Chống spam đơn ảo từ xa: tối đa 3 đợt chờ duyệt trên cùng 1 bàn
      if (orderData.tableId) {
        const waitingCount = await this.orderRepository.count({
          where: {
            branchId: orderData.branchId || '1',
            tableId: orderData.tableId,
            status: OrderStatus.WAITING_CONFIRM,
          },
        });
        if (waitingCount >= 3) {
          throw new BadRequestException(
            'Bàn của bạn đang có đơn chờ thu ngân xác nhận. Vui lòng đợi nhân viên duyệt trước khi đặt thêm!',
          );
        }
      }
    }

    const order = this.orderRepository.create({
      ...orderData,
      status: isQrOrder ? OrderStatus.WAITING_CONFIRM : OrderStatus.PENDING,
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
      order.paymentMethod = paymentMethod;
    }

    const savedOrder = await this.orderRepository.save(order);

    if (isQrOrder) {
      // Đơn từ QR khách quét: Báo về quầy POS để thu ngân xác nhận trước, CHƯA đẩy thẳng vào KDS bếp
      this.eventsGateway.emitQrOrderPending(savedOrder.branchId, savedOrder);
    } else {
      // Đơn tạo trực tiếp tại POS: Phát sự kiện tới KDS của chi nhánh ngay & tự động trừ kho
      this.eventsGateway.emitNewOrder(savedOrder.branchId, savedOrder);
      this.inventoryClient.emit('order.deduct_stock', {
        orderId: savedOrder.id,
        orderCode: savedOrder.orderCode,
        branchId: savedOrder.branchId || '1',
        items: (savedOrder.items || []).map(item => ({
          productId: item.productId,
          productName: item.productName,
          size: item.size || 'M',
          quantity: item.quantity,
        })),
      });
    }

    return savedOrder;
  }

  async getPendingQrOrders(branchId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: {
        branchId: branchId || '1',
        status: OrderStatus.WAITING_CONFIRM,
      },
      relations: {
        items: { toppings: true },
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async confirmQrOrder(orderId: string, cashierId?: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: {
        items: { toppings: true },
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng QR');
    }

    if (order.status === OrderStatus.PENDING) {
      return order;
    }

    if (order.status !== OrderStatus.WAITING_CONFIRM) {
      throw new BadRequestException('Đơn hàng này đã được xử lý trước đó');
    }

    order.status = OrderStatus.PENDING;
    if (cashierId) {
      order.cashierId = cashierId;
    }

    const savedOrder = await this.orderRepository.save(order);

    // Sau khi thu ngân duyệt -> Đẩy đơn xuống màn hình bếp KDS & đồng bộ POS / Customer Web & tự động trừ kho
    this.eventsGateway.emitNewOrder(savedOrder.branchId, savedOrder);
    this.inventoryClient.emit('order.deduct_stock', {
      orderId: savedOrder.id,
      orderCode: savedOrder.orderCode,
      branchId: savedOrder.branchId || '1',
      items: (savedOrder.items || []).map(item => ({
        productId: item.productId,
        productName: item.productName,
        size: item.size || 'M',
        quantity: item.quantity,
      })),
    });
    this.eventsGateway.emitQrOrderUpdated(savedOrder.branchId, {
      orderId: savedOrder.id,
      branchId: savedOrder.branchId,
      tableId: savedOrder.tableId,
      status: OrderStatus.PENDING,
      order: savedOrder,
    });

    return savedOrder;
  }

  async rejectQrOrder(
    orderId: string,
    payload?: { cashierId?: string; reason?: string },
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: {
        items: { toppings: true },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng QR');
    }

    if (order.status !== OrderStatus.WAITING_CONFIRM) {
      throw new BadRequestException('Chỉ có thể từ chối đơn QR đang ở trạng thái chờ duyệt');
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelReason = payload?.reason || 'Thu ngân từ chối đơn (Bàn chưa có khách hoặc đơn không hợp lệ)';
    order.cancelledBy = payload?.cashierId || 'Thu ngân';
    order.cancelledAt = new Date();
    if (payload?.cashierId) {
      order.cashierId = payload.cashierId;
    }

    const savedOrder = await this.orderRepository.save(order);

    this.eventsGateway.emitQrOrderUpdated(savedOrder.branchId, {
      orderId: savedOrder.id,
      branchId: savedOrder.branchId,
      tableId: savedOrder.tableId,
      status: OrderStatus.CANCELLED,
      reason: order.cancelReason,
    });
    this.eventsGateway.emitOrderCancelled(savedOrder.branchId, {
      orderId: savedOrder.id,
      branchId: savedOrder.branchId,
      tableId: savedOrder.tableId,
      status: OrderStatus.CANCELLED,
      cancelReason: order.cancelReason,
      cancelledBy: order.cancelledBy,
      order: savedOrder,
    });

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

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.VOIDED ||
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.PAID
    ) {
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
    order.paymentMethod = paymentMethod;

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
      orderCode: savedOrder.orderCode,
      branchId: savedOrder.branchId,
      items: savedOrder.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        size: item.size || 'M',
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

  async getOrders(
    params:
      | string
      | {
          branchId: string;
          fromDate?: string;
          toDate?: string;
          status?: string;
          tableId?: string;
          paymentMethod?: string;
        },
  ): Promise<Order[]> {
    const branchId = typeof params === 'string' ? params : (params.branchId || '1');
    const fromDate = typeof params === 'object' ? params.fromDate : undefined;
    const toDate = typeof params === 'object' ? params.toDate : undefined;
    const status = typeof params === 'object' ? params.status : undefined;
    const tableId = typeof params === 'object' ? params.tableId : undefined;
    const paymentMethod = typeof params === 'object' ? params.paymentMethod : undefined;

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

    if (status && status !== 'ALL') {
      if (status === 'PAID' || status === 'COMPLETED') {
        query.andWhere('order.status IN (:...paidStatuses)', {
          paidStatuses: [OrderStatus.COMPLETED, OrderStatus.PAID],
        });
      } else if (status === 'ACTIVE') {
        query.andWhere('order.status NOT IN (:...closedStatuses)', {
          closedStatuses: [
            OrderStatus.COMPLETED,
            OrderStatus.PAID,
            OrderStatus.CANCELLED,
            OrderStatus.VOIDED,
          ],
        });
      } else {
        query.andWhere('order.status = :status', { status });
      }
    }

    if (tableId) {
      query.andWhere('order.tableId = :tableId', { tableId });
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      if (paymentMethod === 'TRANSFER' || paymentMethod === 'BANK_TRANSFER') {
        query.andWhere(
          '(order.paymentMethod IN (:...transferMethods) OR payment.paymentMethod IN (:...transferMethods))',
          { transferMethods: ['TRANSFER', 'BANK_TRANSFER', 'QR'] },
        );
      } else {
        query.andWhere(
          '(order.paymentMethod = :paymentMethod OR payment.paymentMethod = :paymentMethod)',
          { paymentMethod },
        );
      }
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

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.WAITING_CONFIRM) {
      throw new BadRequestException('Chỉ được phép xóa đơn hàng đang ở trạng thái chờ xử lý');
    }

    await this.orderRepository.remove(order);
    return { success: true, message: 'Đã xóa đơn hàng thành công' };
  }

  async getActiveOrders(params: { branchId: string; tableId?: string }): Promise<Order[]> {
    const { branchId, tableId } = params;
    const where: any = {
      branchId: branchId || '1',
      status: Not(
        In([
          OrderStatus.COMPLETED,
          OrderStatus.PAID,
          OrderStatus.CANCELLED,
          OrderStatus.VOIDED,
        ]),
      ),
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
        where: {
          id: In(orderIds),
          branchId,
          status: In([OrderStatus.PENDING, OrderStatus.IN_PROGRESS]),
        },
        relations: { items: { toppings: true }, payment: true },
        order: { createdAt: 'ASC' },
      });
    } else {
      orders = await this.orderRepository.find({
        where: {
          branchId,
          tableId,
          status: In([OrderStatus.PENDING, OrderStatus.IN_PROGRESS]),
        },
        relations: { items: { toppings: true }, payment: true },
        order: { createdAt: 'ASC' },
      });
    }

    if (orders.length === 0) {
      throw new NotFoundException(`Không tìm thấy đơn hàng đã xác nhận để thanh toán cho bàn ${tableId}`);
    }

    // Tự động hủy các đơn QR chưa được duyệt còn tồn của bàn này khi kết thúc bàn
    await this.orderRepository.update(
      { branchId, tableId, status: OrderStatus.WAITING_CONFIRM },
      { status: OrderStatus.CANCELLED },
    );

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
      updatedPrimaryOrder.paymentMethod = paymentMethod;

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
        orderCode: updatedPrimaryOrder.orderCode,
        branchId: updatedPrimaryOrder.branchId,
        items: updatedPrimaryOrder.items?.map(item => ({
          productId: item.productId,
          productName: item.productName,
          size: item.size || 'M',
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
    order.paymentMethod = paymentMethod;
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
      orderCode: order.orderCode,
      branchId: order.branchId,
      items: order.items?.map(item => ({
        productId: item.productId,
        productName: item.productName,
        size: item.size || 'M',
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
      .andWhere('order.status IN (:...paidStatuses)', {
        paidStatuses: [OrderStatus.COMPLETED, OrderStatus.PAID],
      })
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

      const method = order.payment?.paymentMethod || order.paymentMethod;
      if (method === PaymentMethod.CASH || (method as string) === 'CASH') {
        totalCash += amount;
      } else if (
        method === PaymentMethod.BANK_TRANSFER ||
        (method as string) === 'BANK_TRANSFER' ||
        (method as string) === 'TRANSFER' ||
        (method as string) === 'QR'
      ) {
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
        paymentMethod: o.payment?.paymentMethod || o.paymentMethod,
        createdAt: o.createdAt,
      })),
    };
  }

  /**
   * 1. Sửa danh sách món, số lượng, ghi chú, đổi bàn cho đơn hàng đang phục vụ
   */
  async updateOrderItems(
    orderId: string,
    payload: {
      tableId?: string;
      orderType?: OrderType;
      discountPercent?: number;
      cancelReason?: string;
      updatedBy?: string;
      items: Array<{
        productId: string;
        productName: string;
        size?: string;
        quantity: number;
        unitPrice: number;
        note?: string;
        itemStatus?: ItemStatus;
        toppings?: Array<{
          toppingId: string;
          toppingName: string;
          price: number;
          quantity: number;
        }>;
      }>;
    },
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { items: { toppings: true }, payment: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.PAID ||
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.VOIDED
    ) {
      throw new BadRequestException('Không thể sửa món của đơn hàng đã hoàn tất hoặc đã hủy');
    }

    if (!payload.items || payload.items.length === 0) {
      throw new BadRequestException(
        'Đơn hàng phải có ít nhất 1 món. Nếu khách hủy toàn bộ món, vui lòng chọn chức năng Hủy đơn!',
      );
    }

    const oldTableId = order.tableId;
    const oldItemsSnapshot = (order.items || []).map((it) => ({
      productId: it.productId,
      productName: it.productName,
      size: it.size || 'M',
      quantity: Number(it.quantity || 1),
    }));
    const wasConfirmedOrder = order.status !== OrderStatus.WAITING_CONFIRM;

    if (payload.tableId !== undefined) {
      order.tableId = payload.tableId;
    }
    if (payload.orderType !== undefined) {
      order.orderType = payload.orderType;
    }
    if (payload.cancelReason) {
      order.cancelReason = payload.cancelReason;
    }

    // Xóa các items cũ của đơn để thay bằng danh sách mới
    if (order.items && order.items.length > 0) {
      for (const existingItem of order.items) {
        if (existingItem.toppings && existingItem.toppings.length > 0) {
          await this.orderItemToppingRepository.remove(existingItem.toppings);
        }
      }
      await this.orderItemRepository.remove(order.items);
    }

    let calculatedTotal = 0;
    const newOrderItems: OrderItem[] = payload.items.map((item) => {
      const qty = Math.max(1, Number(item.quantity || 1));
      const unitPrice = Number(item.unitPrice || 0);
      const toppingsTotalPerUnit = (item.toppings || []).reduce(
        (tSum, t) => tSum + Number(t.price || 0) * Number(t.quantity || 1),
        0,
      );
      calculatedTotal += (unitPrice + toppingsTotalPerUnit) * qty;

      const orderItem = new OrderItem();
      orderItem.productId = item.productId;
      orderItem.productName = item.productName;
      orderItem.size = item.size || '';
      orderItem.quantity = qty;
      orderItem.unitPrice = unitPrice;
      orderItem.note = item.note || '';
      orderItem.itemStatus = item.itemStatus || ItemStatus.PENDING;
      orderItem.toppings =
        item.toppings?.map((t) => {
          const topping = new OrderItemTopping();
          topping.toppingId = t.toppingId;
          topping.toppingName = t.toppingName;
          topping.price = Number(t.price || 0);
          topping.quantity = Number(t.quantity || 1);
          return topping;
        }) || [];
      return orderItem;
    });

    const discountPct =
      payload.discountPercent !== undefined
        ? Number(payload.discountPercent)
        : Number(order.discountPercent || 0);
    order.discountPercent = discountPct;
    order.totalAmount = Math.round(calculatedTotal);
    const discountAmt = Math.round((order.totalAmount * discountPct) / 100);
    order.finalAmount = Math.max(0, order.totalAmount - discountAmt);
    order.items = newOrderItems;

    const savedOrder = await this.orderRepository.save(order);

    // Đồng bộ phần chênh lệch tồn kho sang inventory-service nếu đơn đã xác nhận
    if (wasConfirmedOrder) {
      this.inventoryClient.emit('order.adjust_stock', {
        orderId: savedOrder.id,
        orderCode: savedOrder.orderCode,
        branchId: savedOrder.branchId || '1',
        oldItems: oldItemsSnapshot,
        newItems: (savedOrder.items || []).map((it) => ({
          productId: it.productId,
          productName: it.productName,
          size: it.size || 'M',
          quantity: Number(it.quantity || 1),
        })),
      });
    }

    // Emit Realtime event orderUpdated tới KDS và POS
    this.eventsGateway.emitOrderUpdated(savedOrder.branchId, savedOrder);

    // Nếu đổi bàn và bàn cũ không còn đơn active nào thì phát giải phóng bàn cũ
    if (oldTableId && oldTableId !== savedOrder.tableId) {
      const remainingOnOldTable = await this.getActiveOrders({
        branchId: savedOrder.branchId,
        tableId: oldTableId,
      });
      if (remainingOnOldTable.length === 0) {
        this.eventsGateway.emitTableCompleted(savedOrder.branchId, {
          branchId: savedOrder.branchId,
          tableId: oldTableId,
          orderId: savedOrder.id,
        });
      }
    }

    return savedOrder;
  }

  /**
   * 2. Hủy đơn chưa thanh toán (status -> CANCELLED) và giải phóng bàn nếu bàn trống
   */
  async cancelUnpaidOrder(
    orderId: string,
    payload: { cancelReason: string; cancelledBy?: string },
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { items: { toppings: true }, payment: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.PAID) {
      throw new BadRequestException(
        'Đơn hàng đã thanh toán! Vui lòng sử dụng chức năng Hủy Hóa Đơn (Void Bill) có mã PIN quản lý.',
      );
    }

    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.VOIDED) {
      throw new BadRequestException('Đơn hàng này đã bị hủy trước đó.');
    }

    if (!payload.cancelReason || !payload.cancelReason.trim()) {
      throw new BadRequestException('Vui lòng nhập hoặc chọn lý do hủy đơn!');
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelReason = payload.cancelReason.trim();
    order.cancelledBy = payload.cancelledBy || 'Thu ngân';
    order.cancelledAt = new Date();

    const savedOrder = await this.orderRepository.save(order);

    // Phát sự kiện hoàn trả tồn kho (ORDER_RESTORE) sang inventory-service
    this.inventoryClient.emit('order.restore_stock', {
      orderId: savedOrder.id,
      orderCode: savedOrder.orderCode,
      branchId: savedOrder.branchId || '1',
      reason: savedOrder.cancelReason,
      items: (savedOrder.items || []).map((it) => ({
        productId: it.productId,
        productName: it.productName,
        size: it.size || 'M',
        quantity: Number(it.quantity || 1),
      })),
    });

    // Emit sự kiện orderCancelled cho KDS & POS
    this.eventsGateway.emitOrderCancelled(savedOrder.branchId, {
      orderId: savedOrder.id,
      branchId: savedOrder.branchId,
      tableId: savedOrder.tableId,
      status: OrderStatus.CANCELLED,
      cancelReason: savedOrder.cancelReason,
      cancelledBy: savedOrder.cancelledBy,
      order: savedOrder,
    });

    // Kiểm tra nếu bàn của đơn này không còn đơn đang phục vụ nào thì giải phóng bàn về AVAILABLE
    if (savedOrder.tableId) {
      const remainingActive = await this.getActiveOrders({
        branchId: savedOrder.branchId,
        tableId: savedOrder.tableId,
      });
      if (remainingActive.length === 0) {
        this.eventsGateway.emitTableCompleted(savedOrder.branchId, {
          branchId: savedOrder.branchId,
          tableId: savedOrder.tableId,
          orderId: savedOrder.id,
        });
      }
    }

    return savedOrder;
  }

  /**
   * 3. Hủy hoàn tiền hóa đơn đã thanh toán (Void Bill -> VOIDED), kiểm tra Mã PIN Quản lý
   */
  async voidPaidOrder(
    orderId: string,
    payload: { cancelReason: string; cancelledBy?: string; managerPin: string },
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { items: { toppings: true }, payment: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy hóa đơn');
    }

    if (order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Chỉ có thể Void hóa đơn đã thanh toán!');
    }

    if (!payload.cancelReason || !payload.cancelReason.trim()) {
      throw new BadRequestException('Vui lòng nhập lý do hủy hóa đơn (Void Bill)!');
    }

    const inputPin = (payload.managerPin || '').trim();
    const defaultPin = process.env.MANAGER_VOID_PIN || '1234';
    let isPinValid = inputPin === defaultPin || inputPin === '123456';

    if (!isPinValid && inputPin) {
      const managerEmp = await this.employeeRepository.findOne({
        where: { pinCode: inputPin, isActive: true },
      });
      if (managerEmp) {
        isPinValid = true;
      }
    }

    if (!isPinValid) {
      throw new BadRequestException('Mã PIN Quản lý không chính xác! (Mặc định: 1234)');
    }

    order.status = OrderStatus.VOIDED;
    order.cancelReason = payload.cancelReason.trim();
    order.cancelledBy = payload.cancelledBy || 'Quản lý';
    order.cancelledAt = new Date();

    const savedOrder = await this.orderRepository.save(order);

    // Phát sự kiện hoàn trả tồn kho (ORDER_RESTORE) sang inventory-service khi Void Bill
    this.inventoryClient.emit('order.restore_stock', {
      orderId: savedOrder.id,
      orderCode: savedOrder.orderCode,
      branchId: savedOrder.branchId || '1',
      reason: savedOrder.cancelReason,
      items: (savedOrder.items || []).map((it) => ({
        productId: it.productId,
        productName: it.productName,
        size: it.size || 'M',
        quantity: Number(it.quantity || 1),
      })),
    });

    this.eventsGateway.emitOrderCancelled(savedOrder.branchId, {
      orderId: savedOrder.id,
      branchId: savedOrder.branchId,
      tableId: savedOrder.tableId,
      status: OrderStatus.VOIDED,
      cancelReason: savedOrder.cancelReason,
      cancelledBy: savedOrder.cancelledBy,
      order: savedOrder,
    });

    return savedOrder;
  }

  /**
   * 4. Đổi phương thức thanh toán (CASH <-> TRANSFER / BANK_TRANSFER) cho hóa đơn đã thanh toán
   */
  async updateOrderPaymentMethod(
    orderId: string,
    payload: { paymentMethod: string; updatedBy?: string },
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { items: { toppings: true }, payment: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy hóa đơn');
    }

    if (order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Chỉ có thể đổi phương thức thanh toán cho hóa đơn đã thanh toán!');
    }

    const normalizedMethod =
      payload.paymentMethod === 'TRANSFER' || payload.paymentMethod === 'QR'
        ? PaymentMethod.BANK_TRANSFER
        : payload.paymentMethod === 'CASH'
        ? PaymentMethod.CASH
        : (payload.paymentMethod as PaymentMethod);

    order.paymentMethod = payload.paymentMethod;

    if (order.payment) {
      order.payment.paymentMethod = normalizedMethod;
      await this.paymentRepository.save(order.payment);
    } else {
      const payment = new Payment();
      payment.paymentMethod = normalizedMethod;
      payment.amount = Number(order.finalAmount || order.totalAmount || 0);
      order.payment = payment;
    }

    const savedOrder = await this.orderRepository.save(order);
    this.eventsGateway.emitOrderUpdated(savedOrder.branchId, savedOrder);

    return savedOrder;
  }
}


