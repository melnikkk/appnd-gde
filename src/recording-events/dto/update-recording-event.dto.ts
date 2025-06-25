import { IsNumber, IsOptional, IsObject, IsEnum } from 'class-validator';
import { RecordingEventType } from '../entities/recording-event.constants';
import { RecordingEventData } from '../entities/recording-events.types';

export class UpdateRecordingEventDto {
  @IsOptional()
  @IsEnum(RecordingEventType)
  type?: RecordingEventType;

  @IsOptional()
  @IsNumber()
  timestamp?: number;

  @IsOptional()
  @IsObject()
  data?: RecordingEventData;
}
