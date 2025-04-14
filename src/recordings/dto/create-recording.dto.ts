import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRecordingEventDto } from './create-recording-event.dto';

export class CreateRecordingDto {
  @IsUUID()
  id: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  // @IsInt()
  // duration: number;

  @IsInt()
  fileSize: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecordingEventDto)
  events: CreateRecordingEventDto[];
}
