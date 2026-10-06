import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CheckOutDto {
  @IsString()
  @IsNotEmpty()
  employeeCode: string;

  @IsOptional()
  @IsString()
  pinCode?: string;

  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsOptional()
  @IsString()
  snapshotPhoto?: string;

  @IsOptional()
  @IsBoolean()
  faceVerified?: boolean;
}
