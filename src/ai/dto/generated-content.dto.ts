import { IsString } from 'class-validator';

export class GeneratedContentDto {
  @IsString()
  title: string;

  @IsString()
  description: string;
}
