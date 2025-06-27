import { IsOptional, IsString } from 'class-validator';

export class GenerateAiContentDto {
  @IsString()
  @IsOptional()
  recordingPurpose?: string;

  @IsString()
  @IsOptional()
  recordingDescription?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  productContext?: string;
}
