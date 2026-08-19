import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType } from '../entities/order.entity';
import { PaymentMethod } from '../entities/payment.entity';

class OrderItemToppingDto {
  @IsString()
  toppingId: string;

  @IsString()
  toppingName: string;

  @IsNumber()
  price: number;

  @IsNumber()
  quantity: number;
}

class OrderItemDto {
  @IsString()
  productId: string;

  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemToppingDto)
  toppings?: OrderItemToppingDto[];
}

export class CreateOrderDto {
  @IsString()
  branchId: string;

  @IsOptional()
  @IsString()
  tableId?: string;

  @IsEnum(OrderType)
  orderType: OrderType;

  @IsNumber()
  totalAmount: number;

  @IsNumber()
  finalAmount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
