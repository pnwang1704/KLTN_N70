import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsBoolean, Matches } from 'class-validator';

export class CreateShiftDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:mm format (00:00 - 23:59)' })
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be in HH:mm format (00:00 - 23:59)' })
  endTime: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gracePeriodMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
