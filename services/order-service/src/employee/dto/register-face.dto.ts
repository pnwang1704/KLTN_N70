import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterFaceDto {
  @IsArray()
  @IsNotEmpty()
  descriptor: number[];

  @IsOptional()
  @IsString()
  avatarBase64?: string;
}
