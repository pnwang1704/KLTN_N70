import { IsEnum, IsString } from 'class-validator';
import { ItemStatus } from '../entities/order-item.entity';

export class UpdateItemStatusDto {
  @IsString()
  orderItemId: string;

  @IsEnum(ItemStatus)
  itemStatus: ItemStatus;
}
