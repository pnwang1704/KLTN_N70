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
import { Employee } from './employee/entities/employee.entity';
import { EmployeeModule } from './employee/employee.module';
import { Attendance } from './attendance/entities/attendance.entity';
import { AttendanceModule } from './attendance/attendance.module';

const dbUrl = process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/db';
const isSsl = process.env.DATABASE_SSL === 'true' || dbUrl.includes('sslmode=require') || dbUrl.includes('neon.tech');

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: dbUrl,
      entities: [Order, OrderItem, OrderItemTopping, Payment, Expense, Shift, Employee, Attendance],
      synchronize: true, // dev only
      ssl: isSsl ? { rejectUnauthorized: false } : false,
      extra: isSsl ? { ssl: { rejectUnauthorized: false } } : undefined,
    }),
    OrderModule,
    ShiftModule,
    EmployeeModule,
    AttendanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

