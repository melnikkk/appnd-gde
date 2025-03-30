import { IsUUID } from 'class-validator';

export class GetRecordingDto {
  @IsUUID()
  id: string;
}

export class RecordingResponseDto {
  id: string;
  name: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
  sourceUrl: string;
}
