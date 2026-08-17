import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://user:password@localhost:5672'],
      queue: 'order_queue',
      queueOptions: {
        durable: false
      },
    },
  });

  app.enableCors({ origin: '*' });
  
  await app.startAllMicroservices();
  await app.listen(3004);
}
bootstrap();
