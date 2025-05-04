import {
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateRecordingDataDto {
  @IsInt()
  startTime: number;

  @IsInt()
  stopTime: number;
}

export class CreateRecordingDto {
  @IsUUID()
  id: string;

  @IsNotEmpty()
  @IsString()
  data: string;
}