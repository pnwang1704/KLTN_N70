import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrderModule } from './order/order.module';
import { Order } from './order/entities/order.entity';
import { OrderItem } from './order/entities/order-item.entity';
import { OrderItemTopping } from './order/entities/order-item-topping.entity';
import { Payment } from './order/entities/payment.entity';
import { Expense } from './order/entities/expense.entity';
import { Shift } from './shift/entities/shift.entity';
import { ShiftModule } from './shift/shift.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/db',
      entities: [Order, OrderItem, OrderItemTopping, Payment, Expense, Shift],
      synchronize: true, // dev only
    }),
    OrderModule,
    ShiftModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

