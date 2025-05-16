import {
  IsNotEmpty,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateRecordingDataDto {
  @IsNotEmpty()
  startTime: number;

  stopTime: number;
}

export class CreateRecordingDto {
  @IsUUID()
  id: string;

  @IsNotEmpty()
  @IsString()
  data: string;
}