import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateIngredientDto {
  @IsString()
  name: string;

  @IsString()
  unit: string;

  @IsOptional()
  @IsNumber()
  minStockThreshold?: number;
}
