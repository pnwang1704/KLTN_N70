import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderItemTopping } from './entities/order-item-topping.entity';
import { Payment } from './entities/payment.entity';
import { EventsGateway } from '../events/events.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderItemTopping, Payment]),
    ClientsModule.register([
      {
        name: 'INVENTORY_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://user:password@localhost:5672'],
          queue: 'inventory_queue',
          queueOptions: {
            durable: false
          },
        },
      },
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService, EventsGateway],
})
export class OrderModule {}
