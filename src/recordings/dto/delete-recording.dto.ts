import { IsUUID } from 'class-validator';

export class DeleteRecordingDto {
  @IsUUID()
  id: string;
}
