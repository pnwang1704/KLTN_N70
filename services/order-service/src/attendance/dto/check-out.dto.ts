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

  @IsString()
  @IsNotEmpty()
  snapshotPhoto: string;

  @IsOptional()
  @IsBoolean()
  faceVerified?: boolean;
}
