import { IsBoolean, IsNumber, IsArray, IsString, Min, Max, IsOptional, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export type PaymentPolicyType = 'cod' | 'delivery_advance' | 'full_advance';
export type MfsProviderType = 'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'Bank';
export type MfsAccountType = 'Personal' | 'Merchant' | 'Agent';

export class MfsAccountDto {
  @IsString({ message: 'provider must be a string' })
  @IsIn(['bKash', 'Nagad', 'Rocket', 'Upay', 'Bank'], { message: 'provider must be bKash, Nagad, Rocket, Upay, or Bank' })
  provider: MfsProviderType;

  @IsString({ message: 'accountNumber must be a string' })
  accountNumber: string;

  @IsString({ message: 'accountType must be a string' })
  @IsIn(['Personal', 'Merchant', 'Agent'], { message: 'accountType must be Personal, Merchant, or Agent' })
  accountType: MfsAccountType;
}

export class OrderPlacementConfigDto {
  @IsBoolean({ message: 'requireExplicitConfirmation must be a boolean' })
  requireExplicitConfirmation: boolean;

  @IsOptional()
  @IsString({ message: 'paymentPolicy must be a string' })
  @IsIn(['cod', 'delivery_advance', 'full_advance'], { message: 'paymentPolicy must be cod, delivery_advance, or full_advance' })
  paymentPolicy?: PaymentPolicyType;

  @IsOptional()
  @IsNumber({}, { message: 'deliveryChargeInsideDhaka must be a number' })
  @Min(0, { message: 'deliveryChargeInsideDhaka must be >= 0' })
  deliveryChargeInsideDhaka?: number;

  @IsOptional()
  @IsNumber({}, { message: 'deliveryChargeOutsideDhaka must be a number' })
  @Min(0, { message: 'deliveryChargeOutsideDhaka must be >= 0' })
  deliveryChargeOutsideDhaka?: number;

  @IsOptional()
  @IsArray({ message: 'mfsAccounts must be an array' })
  @ValidateNested({ each: true })
  @Type(() => MfsAccountDto)
  mfsAccounts?: MfsAccountDto[];

  @IsOptional()
  @IsString({ message: 'paymentInstructionNote must be a string' })
  paymentInstructionNote?: string;
}

export class ImageReadingConfigDto {}

export class SupportDetectionConfigDto {
  @IsArray({ message: 'reasonCategories must be an array' })
  @IsString({ each: true, message: 'Each item in reasonCategories must be a string' })
  reasonCategories: string[];
}

export class ProductMatchingConfigDto {
  @IsNumber({}, { message: 'minMatchConfidence must be a number' })
  @Min(0, { message: 'minMatchConfidence must be >= 0' })
  @Max(1, { message: 'minMatchConfidence must be <= 1' })
  minMatchConfidence: number;

  @IsOptional()
  @IsNumber({}, { message: 'maxProductsToSend must be a number' })
  @Min(1, { message: 'maxProductsToSend must be >= 1' })
  @Max(10, { message: 'maxProductsToSend must be <= 10' })
  maxProductsToSend?: number;
}

export class UpdateToolDto {
  @IsOptional()
  @IsBoolean({ message: 'isEnabled must be a boolean' })
  isEnabled?: boolean;

  @IsOptional()
  configJson?: any;
}
