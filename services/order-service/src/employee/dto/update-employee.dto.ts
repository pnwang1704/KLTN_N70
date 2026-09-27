import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  employeeCode?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  pinCode?: string;

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
