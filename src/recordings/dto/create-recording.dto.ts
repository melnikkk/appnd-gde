import { IsUUID } from 'class-validator';

export class CreateRecordingDto {
  @IsUUID()
  id: string;
}
