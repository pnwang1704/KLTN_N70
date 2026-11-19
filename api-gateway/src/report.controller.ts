import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Roles } from './common/decorators/roles.decorator';

@Controller('reports')
export class ReportController {
  constructor(
    @Inject('REPORTING_SERVICE') private readonly reportingClient: ClientProxy,
  ) {}

  @Roles('ADMIN', 'MANAGER')
  @Get('overview')
  getOverview(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingClient.send('report_overview', {
      branchId,
      startDate,
      endDate,
    });
  }

  @Roles('ADMIN', 'MANAGER')
  @Get('revenue-chart')
  getRevenueChart(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingClient.send('report_revenue_chart', {
      branchId,
      startDate,
      endDate,
    });
  }

  @Roles('ADMIN', 'MANAGER')
  @Get('payment-methods')
  getPaymentMethods(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingClient.send('report_payment_methods', {
      branchId,
      startDate,
      endDate,
    });
  }

  @Roles('ADMIN', 'MANAGER')
  @Get('top-products')
  getTopProducts(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingClient.send('report_top_products', {
      branchId,
      startDate,
      endDate,
    });
  }

  @Roles('ADMIN', 'MANAGER')
  @Get('peak-hours')
  getPeakHours(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingClient.send('report_peak_hours', {
      branchId,
      startDate,
      endDate,
    });
  }

  @Roles('ADMIN', 'MANAGER')
  @Get('branches-comparison')
  getBranchesComparison(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingClient.send('report_branches_comparison', {
      branchId,
      startDate,
      endDate,
    });
  }

  @Roles('ADMIN', 'MANAGER')
  @Get('export-orders')
  getExportOrders(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingClient.send('report_export_orders', {
      branchId,
      startDate,
      endDate,
    });
  }

  @Roles('ADMIN', 'MANAGER')
  @Post('ai-summary')
  getAiSummary(
    @Body()
    body: {
      branchId?: string;
      startDate?: string;
      endDate?: string;
      forceRefresh?: boolean;
    },
  ) {
    return this.reportingClient.send('report_ai_summary', body || {});
  }

  @Roles('ADMIN', 'MANAGER')
  @Post('ai-chat')
  getAiChat(
    @Body()
    body: {
      question: string;
      branchId?: string;
      startDate?: string;
      endDate?: string;
      history?: Array<{ role: 'user' | 'model'; content: string }>;
    },
  ) {
    return this.reportingClient.send('report_ai_chat', body || {});
  }
}
