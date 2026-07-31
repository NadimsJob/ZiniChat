import { Injectable, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  OrderPlacementConfigDto,
  ImageReadingConfigDto,
  SupportDetectionConfigDto,
  ProductMatchingConfigDto
} from '../dto/tool-config.dto';

@Injectable()
export class ToolConfigValidatorService {
  private readonly configDtoMap: Record<string, any> = {
    order_placement: OrderPlacementConfigDto,
    image_reading: ImageReadingConfigDto,
    support_detection: SupportDetectionConfigDto,
    product_matching: ProductMatchingConfigDto
  };

  async validateToolConfig(toolType: string, configJson: any): Promise<any> {
    const DtoClass = this.configDtoMap[toolType];

    if (!DtoClass) {
      throw new BadRequestException(`Unknown tool type: ${toolType}`);
    }

    if (configJson === null || configJson === undefined) {
      return this.getDefaultConfigForTool(toolType);
    }

    // Convert plain object to class instance
    const dto = plainToInstance(DtoClass, configJson);

    // Validate DTO instance
    const errors = await validate(dto);

    if (errors.length > 0) {
      const errorMessages = errors
        .map(err => `${err.property}: ${Object.values(err.constraints || {}).join(', ')}`)
        .join('; ');
      
      throw new BadRequestException(`Invalid config for ${toolType}: ${errorMessages}`);
    }

    return configJson;
  }

  getDefaultConfigForTool(toolType: string): any {
    const defaults: Record<string, any> = {
      order_placement: { requireExplicitConfirmation: true },
      image_reading: {},
      support_detection: { reasonCategories: ['general', 'complaint', 'refund_return', 'delivery_issue'] },
      product_matching: { minMatchConfidence: 0.6 }
    };

    return defaults[toolType] || {};
  }
}
