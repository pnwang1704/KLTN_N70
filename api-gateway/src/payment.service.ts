import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PayOS } from '@payos/node';

@Injectable()
export class PaymentService {
  private payOS: PayOS;

  constructor(
    @Inject('ORDER_SERVICE') private orderClient: ClientProxy,
  ) {
    const clientId = process.env.PAYOS_CLIENT_ID || 'CLIENT_ID';
    const apiKey = process.env.PAYOS_API_KEY || 'API_KEY';
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY || 'CHECKSUM_KEY';
    this.payOS = new PayOS({
      clientId,
      apiKey,
      checksumKey
    });
  }

  async createPaymentLink(body: { orderId: string; orderCode: number; totalAmount: number; returnUrl?: string; cancelUrl?: string }) {
    try {
      const { orderId, orderCode, totalAmount, returnUrl, cancelUrl } = body;
      
      const requestData = {
        orderCode: Number(orderCode),
        amount: Number(totalAmount),
        description: `Thanh toan DON ${orderCode}`.substring(0, 25), // PayOS desc limit is 25 chars
        cancelUrl: cancelUrl || 'http://localhost:5174/cancel',
        returnUrl: returnUrl || 'http://localhost:5174/success',
      };

      const paymentLinkRes = await this.payOS.paymentRequests.create(requestData);
      const bin = paymentLinkRes.bin || '970422';
      const accountNumber = paymentLinkRes.accountNumber || 'VQRQAMOXB8388';
      const accountName = paymentLinkRes.accountName || 'PHAN NHAT QUANG';
      const desc = paymentLinkRes.description || requestData.description;
      const qrUrl = `https://img.vietqr.io/image/${bin}-${accountNumber}-compact2.png?amount=${paymentLinkRes.amount}&addInfo=${encodeURIComponent(desc)}&accountName=${encodeURIComponent(accountName)}`;
      return {
        ...paymentLinkRes,
        bin,
        accountNumber,
        accountName,
        qrUrl,
      };
    } catch (error: any) {
      console.error('Error creating PayOS payment link:', error);
      if (error?.code === '231' || error?.error?.code === '231') {
        try {
          const existing: any = await this.payOS.paymentRequests.get(Number(body.orderCode));
          const bin = existing.bin || '970422';
          const accountNumber = existing.accountNumber || 'VQRQAMOXB8388';
          const accountName = existing.accountName || 'PHAN NHAT QUANG';
          const desc = `Thanh toan DON ${body.orderCode}`.substring(0, 25);
          const amount = existing.amount || Number(body.totalAmount);
          const qrUrl = `https://img.vietqr.io/image/${bin}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(desc)}&accountName=${encodeURIComponent(accountName)}`;
          return {
            ...existing,
            bin,
            accountNumber,
            accountName,
            description: desc,
            amount,
            checkoutUrl: existing.checkoutUrl || (existing.id ? `https://pay.payos.vn/web/${existing.id}` : undefined),
            qrUrl,
          };
        } catch (fetchErr) {
          console.error('Error fetching existing PayOS payment link:', fetchErr);
        }
      }
      throw new BadRequestException('Failed to create payment link');
    }
  }

  async handleWebhook(webhookBody: any) {
    try {
      // Verify signature
      const data = await this.payOS.webhooks.verify(webhookBody);
      
      if (data.code === '00' || data.desc === 'success') {
        const orderCode = data.orderCode;
        const amount = data.amount;
        
        // Notify order service
        this.orderClient.emit('process_payos_webhook', { orderCode, amount });
        
        return { success: true };
      }
      return { success: false, message: 'Not a successful payment' };
    } catch (error) {
      console.error('Webhook verification failed:', error);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  async checkPaymentStatus(orderCode: number) {
    try {
      const paymentLink = await this.payOS.paymentRequests.get(orderCode);
      if (paymentLink.status === 'PAID') {
        // Trigger the same logic as webhook if paid
        this.orderClient.emit('process_payos_webhook', { 
          orderCode, 
          amount: paymentLink.amount 
        });
        return { paid: true };
      }
      return { paid: false, status: paymentLink.status };
    } catch (error) {
      console.error('Error checking payment status:', error);
      return { paid: false };
    }
  }
}
