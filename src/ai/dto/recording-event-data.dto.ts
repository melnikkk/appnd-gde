import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class RecordingEventDataDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsObject()
  @IsNotEmpty()
  targetElement: {
    elementType: string;
    elementId?: string;
    elementName?: string;
    elementClass?: string;
    textContent?: string;
    placeholder?: string;
    ariaLabel?: string;
  };

  @IsObject()
  @IsNotEmpty()
  pageContext: {
    url: string;
    title: string;
    parentElements?: Array<{
      elementType: string;
      textContent?: string;
    }>;
  };

  @IsObject()
  @IsOptional()
  userInteraction?: {
    inputValue?: string;
    selectedOptions?: Array<string>;
    isChecked?: boolean;
  };

  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @IsObject()
  @IsOptional()
  additionalContext?: {
    companyName?: string;
    industry?: string;
    productContext?: string;
    userRole?: string;
    recordingPurpose?: string;
    recordingDescription?: string;
  };
}
