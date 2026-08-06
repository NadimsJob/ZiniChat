import { IsString, MaxLength, MinLength, IsOptional } from 'class-validator';

export class CreateQnaDto {
  @IsString({ message: 'Question must be a string' })
  @MinLength(5, { message: 'Question must be at least 5 characters' })
  @MaxLength(100, { message: 'Question cannot exceed 100 characters' })
  question: string;

  @IsString({ message: 'Answer must be a string' })
  @MinLength(10, { message: 'Answer must be at least 10 characters' })
  @MaxLength(300, { message: 'Answer cannot exceed 300 characters' })
  answer: string;
}

export class UpdateQnaDto {
  @IsOptional()
  @IsString({ message: 'Question must be a string' })
  @MinLength(5, { message: 'Question must be at least 5 characters' })
  @MaxLength(100, { message: 'Question cannot exceed 100 characters' })
  question?: string;

  @IsOptional()
  @IsString({ message: 'Answer must be a string' })
  @MinLength(10, { message: 'Answer must be at least 10 characters' })
  @MaxLength(300, { message: 'Answer cannot exceed 300 characters' })
  answer?: string;
}
