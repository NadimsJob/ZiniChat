import { IsBoolean, IsNumber, IsArray, IsString, Min, Max, IsOptional } from 'class-validator';

export class OrderPlacementConfigDto {
  @IsBoolean({ message: 'requireExplicitConfirmation must be a boolean' })
  requireExplicitConfirmation: boolean;
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
}

export class UpdateToolDto {
  @IsOptional()
  @IsBoolean({ message: 'isEnabled must be a boolean' })
  isEnabled?: boolean;

  @IsOptional()
  configJson?: any;
}
