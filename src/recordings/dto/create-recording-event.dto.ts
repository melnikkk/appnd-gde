import { IsNotEmpty, IsObject, IsUUID, IsNumber, IsEnum } from 'class-validator';
import { RecordingEventType } from '../entities/recording-event.constants';
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
}
