import { IsNotEmpty, IsInt, IsString, IsUUID } from 'class-validator';

export class ViewDataDto {
  @IsNotEmpty()
  @IsInt()
  width: number;

  @IsNotEmpty()
  @IsInt()
  height: number;
}

export class CreateRecordingDto {
  @IsUUID()
  id: string;

  @IsNotEmpty()
  @IsString()
  data: string;
}
