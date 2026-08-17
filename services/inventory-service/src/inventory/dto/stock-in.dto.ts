import { IsString, IsNumber } from 'class-validator';

export class StockInDto {
  @IsString()
  branchId: string;

  @IsString()
  ingredientId: string;

  @IsNumber()
  quantity: number;
}
