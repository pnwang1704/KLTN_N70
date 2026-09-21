import { IsString, IsOptional, IsNumber, Min, IsBoolean, Matches } from 'class-validator';

export class UpdateShiftDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:mm format (00:00 - 23:59)' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be in HH:mm format (00:00 - 23:59)' })
  endTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gracePeriodMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
