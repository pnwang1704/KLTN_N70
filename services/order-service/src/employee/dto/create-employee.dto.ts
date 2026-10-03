import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsOptional()
  @IsString()
  employeeCode?: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  role: string; // 'CASHIER' | 'BARISTA' | 'WAITER' | 'MANAGER'

  @IsString()
  @IsNotEmpty()
  pinCode: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsArray()
  faceDescriptor?: number[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
