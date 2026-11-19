import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReportingModule } from './reporting/reporting.module';
import { ReportSnapshot } from './reporting/entities/report-snapshot.entity';

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.REPORTING_DATABASE_URL ||
  'postgres://postgres:password@localhost:5438/reporting_db';
const isSsl =
  process.env.DATABASE_SSL === 'true' ||
  dbUrl.includes('sslmode=require') ||
  dbUrl.includes('neon.tech');

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: dbUrl,
      entities: [ReportSnapshot],
      synchronize: true,
      ssl: isSsl ? { rejectUnauthorized: false } : false,
      extra: isSsl ? { ssl: { rejectUnauthorized: false } } : undefined,
    }),
    ReportingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
