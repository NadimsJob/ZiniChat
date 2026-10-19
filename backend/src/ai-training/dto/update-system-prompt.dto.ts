import { IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class UpdateSystemPromptDto {
  @IsString({ message: 'System prompt must be a string' })
  @MinLength(10, { message: 'System prompt must be at least 10 characters' })
  @MaxLength(4000, { message: 'System prompt cannot exceed 4,000 characters' })
  @Matches(/^[^\x00-\x08\x0B-\x0C\x0E-\x1F]*$/, {
    message: 'System prompt contains invalid control characters'
  })
  systemPrompt: string;
}
