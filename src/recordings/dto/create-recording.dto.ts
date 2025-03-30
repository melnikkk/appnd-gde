import { IsInt, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateRecordingDto {
  @IsUUID()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  // @IsInt()
  // duration: number;

  @IsInt()
  fileSize: number;
}
