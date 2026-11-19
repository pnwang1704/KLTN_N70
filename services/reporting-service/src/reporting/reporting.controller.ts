import { Controller, Get, Query } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ReportingService, type ReportFilterQuery } from './reporting.service';

@Controller('reports')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  // --- HTTP ENDPOINTS (Direct on port 3005) ---
  @Get('overview')
  getOverviewHttp(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingService.getOverview({ branchId, startDate, endDate });
  }

  @Get('revenue-chart')
  getRevenueChartHttp(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingService.getRevenueChart({ branchId, startDate, endDate });
  }

  @Get('payment-methods')
  getPaymentMethodsHttp(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingService.getPaymentMethods({ branchId, startDate, endDate });
  }

  @Get('top-products')
  getTopProductsHttp(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingService.getTopProducts({ branchId, startDate, endDate });
  }

  @Get('peak-hours')
  getPeakHoursHttp(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingService.getPeakHours({ branchId, startDate, endDate });
  }

  @Get('branches-comparison')
  getBranchesComparisonHttp(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingService.getBranchesComparison({ branchId, startDate, endDate });
  }

  @Get('export-orders')
  getExportOrdersHttp(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingService.getExportOrders({ branchId, startDate, endDate });
  }

  // --- RABBITMQ MESSAGE PATTERNS (Via API Gateway) ---
  @MessagePattern('report_overview')
  getOverviewRpc(@Payload() query: ReportFilterQuery) {
    return this.reportingService.getOverview(query || {});
  }

  @MessagePattern('report_revenue_chart')
  getRevenueChartRpc(@Payload() query: ReportFilterQuery) {
    return this.reportingService.getRevenueChart(query || {});
  }

  @MessagePattern('report_payment_methods')
  getPaymentMethodsRpc(@Payload() query: ReportFilterQuery) {
    return this.reportingService.getPaymentMethods(query || {});
  }

  @MessagePattern('report_top_products')
  getTopProductsRpc(@Payload() query: ReportFilterQuery) {
    return this.reportingService.getTopProducts(query || {});
  }

  @MessagePattern('report_peak_hours')
  getPeakHoursRpc(@Payload() query: ReportFilterQuery) {
    return this.reportingService.getPeakHours(query || {});
  }

  @MessagePattern('report_branches_comparison')
  getBranchesComparisonRpc(@Payload() query: ReportFilterQuery) {
    return this.reportingService.getBranchesComparison(query || {});
  }

  @MessagePattern('report_export_orders')
  getExportOrdersRpc(@Payload() query: ReportFilterQuery) {
    return this.reportingService.getExportOrders(query || {});
  }
}
