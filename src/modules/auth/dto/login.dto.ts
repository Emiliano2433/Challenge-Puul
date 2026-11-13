import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@puul.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin12345' })
  @IsString()
  password: string;
}

export class TokenResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty({ example: 'Bearer' }) tokenType: string;
}
