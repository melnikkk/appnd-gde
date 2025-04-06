import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class CreateRecordingEventDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;
}
