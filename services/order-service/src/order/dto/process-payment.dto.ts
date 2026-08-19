import { IsEnum, IsNumber } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class ProcessPaymentDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsNumber()
  amountPaid: number;
}
