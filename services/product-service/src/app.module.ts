import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';

const dbUrl = process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/db';
const isSsl = process.env.DATABASE_SSL === 'true' || dbUrl.includes('sslmode=require') || dbUrl.includes('neon.tech');

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: dbUrl,
      entities: [],
      synchronize: true,
      ssl: isSsl ? { rejectUnauthorized: false } : false,
      extra: isSsl ? { ssl: { rejectUnauthorized: false } } : undefined,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

