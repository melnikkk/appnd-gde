import {
  IsNotEmpty,
  IsObject,
  IsUUID,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { RecordingEventType } from '../recording-event.constants';
import { RecordingEventData } from '../entities/recording-events.types';

export class CreateRecordingEventDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsEnum(RecordingEventType)
  @IsNotEmpty()
  type: RecordingEventType;

  @IsObject()
  @IsNotEmpty()
  data: RecordingEventData;

  @IsNumber()
  @IsNotEmpty()
  timestamp: number;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
