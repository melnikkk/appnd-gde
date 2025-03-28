import { IsUUID } from 'class-validator';

export class GetRecordingDto {
  @IsUUID()
  id: string;
}
