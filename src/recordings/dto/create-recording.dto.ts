import {
  IsNotEmpty,
  IsInt,
  IsString,
  IsUUID,
} from 'class-validator';

export class ViewDataDto {
  @IsNotEmpty()
  @IsInt()
  width: number;

  @IsNotEmpty()
  @IsInt()
  height: number;
}

export class CreateRecordingDataDto {
  @IsNotEmpty()
  @IsInt()
  startTime: number;

  @IsInt()
  stopTime: number;

  @IsNotEmpty()
  viewData: ViewDataDto;
}

export class CreateRecordingDto {
  @IsUUID()
  id: string;

  @IsNotEmpty()
  @IsString()
  data: string;
}