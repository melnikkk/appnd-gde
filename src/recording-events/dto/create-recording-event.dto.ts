import { IsNumber, IsOptional, IsObject, IsEnum } from 'class-validator';
import { RecordingEventType } from '../entities/recording-event.constants';
import { RecordingEventData } from '../../recordings/entities/recording-events.types';

export class CreateRecordingEventDto {
  @IsEnum(RecordingEventType)
  type: RecordingEventType;

  @IsNumber()
  timestamp: number;

  @IsOptional()
  @IsObject()
  data?: RecordingEventData;
}
