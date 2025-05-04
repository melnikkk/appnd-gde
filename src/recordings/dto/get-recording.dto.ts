import { IsUUID } from 'class-validator';

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
}
