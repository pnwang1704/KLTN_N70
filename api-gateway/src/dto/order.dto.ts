import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum OrderType {
  AT_TABLE = 'AT_TABLE',
  TAKE_AWAY = 'TAKE_AWAY',
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum ItemStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export class OrderItemToppingDto {
  @IsString()
  toppingId: string;

  @IsString()
  toppingName: string;

  @IsNumber()
  price: number;

  @IsNumber()
  quantity: number;
}

export class OrderItemDto {
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

export class ProcessPaymentDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsNumber()
  amountPaid: number;
}

export class UpdateItemStatusDto {
  @IsString()
  orderItemId: string;

  @IsEnum(ItemStatus)
  itemStatus: ItemStatus;
}
