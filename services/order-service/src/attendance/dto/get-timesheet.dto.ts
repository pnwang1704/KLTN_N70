import { IsString, IsOptional } from 'class-validator';

export class GetTimesheetDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}
