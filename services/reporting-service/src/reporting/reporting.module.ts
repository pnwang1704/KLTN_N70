import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ReportSnapshot } from './entities/report-snapshot.entity';
import { AiReportCache } from './entities/ai-report-cache.entity';
import { ReportingService } from './reporting.service';
import { AiAnalyticsService } from './ai-analytics.service';
import { ReportingController } from './reporting.controller';

const rmqUrl = process.env.RABBITMQ_URL || 'amqp://user:password@localhost:5672';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReportSnapshot, AiReportCache]),
    ClientsModule.register([
      {
        name: 'ORDER_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [rmqUrl],
          queue: 'order_queue',
          queueOptions: { durable: false },
        },
      },
      {
        name: 'INVENTORY_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [rmqUrl],
          queue: 'inventory_queue',
          queueOptions: { durable: false },
        },
      },
      {
        name: 'BRANCH_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [rmqUrl],
          queue: 'branch_queue',
          queueOptions: { durable: false },
        },
      },
    ]),
  ],
  controllers: [ReportingController],
  providers: [ReportingService, AiAnalyticsService],
})
export class ReportingModule {}
