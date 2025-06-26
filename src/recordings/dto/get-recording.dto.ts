import { IsUUID } from 'class-validator';
import { RecordingEvent } from '../../recording-events/entities/recording-events.types';

export class GetRecordingRequestDto {
  @IsUUID()
  id: string;
}

export class GetRecordingResponseDto {
  id: string;
  name: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
  sourceUrl: string;
  thumbnailUrl: string | null;
  startTime: number;
  stopTime: number | null;
  duration: number;
  viewData: {
    width: number;
    height: number;
  };
  events: Record<string, RecordingEvent>;
}
