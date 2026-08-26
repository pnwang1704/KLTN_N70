import { Controller, Post, Body, Inject, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Public } from './common/decorators/public.decorator';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('payos/create')
  async createPayOSPayment(
    @Body() body: { orderId: string; orderCode: number; totalAmount: number; returnUrl?: string; cancelUrl?: string }
  ) {
    return this.paymentService.createPaymentLink(body);
  }
}

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Public()
  @Post('payos')
  async handlePayOSWebhook(@Body() body: any) {
    return this.paymentService.handleWebhook(body);
  }
}
