import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  businessName!: string;

  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;

  @IsOptional()
  @IsString()
  phoneNo?: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  businessType?: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword!: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class GoogleCallbackDto {
  @IsString()
  @IsNotEmpty()
  credential!: string;

  @IsOptional()
  @IsString()
  planId?: string;
}
