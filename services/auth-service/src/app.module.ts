import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { User } from './auth/entities/user.entity';

const dbUrl = process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/db';
const isSsl = process.env.DATABASE_SSL === 'true' || dbUrl.includes('sslmode=require') || dbUrl.includes('neon.tech');

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: dbUrl,
      entities: [User],
      synchronize: true, // dev only
      ssl: isSsl ? { rejectUnauthorized: false } : false,
      extra: isSsl ? { ssl: { rejectUnauthorized: false } } : undefined,
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

