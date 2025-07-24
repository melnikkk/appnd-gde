import {
  IsNotEmpty,
  IsObject,
  IsUUID,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RecordingEventType } from '../recording-event.constants';
import {
  RecordingEventData,
  TargetElement,
  ParentElement,
  PageContext,
  Interaction,
} from '../entities/recording-events.types';

class TargetElementDto implements TargetElement {
  @IsString()
  @IsOptional()
  elementType?: string;

  @IsString()
  @IsOptional()
  elementId?: string;

  @IsString()
  @IsOptional()
  elementName?: string;

  @IsString()
  @IsOptional()
  elementClass?: string;

  @IsString()
  @IsOptional()
  textContent?: string;

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsString()
  @IsOptional()
  ariaLabel?: string;
}

class ParentElementDto implements ParentElement {
  @IsString()
  @IsOptional()
  tagName?: string;

  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  className?: string;
}

class PageContextDto implements PageContext {
  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ParentElementDto)
  parentElements?: Array<ParentElementDto>;
}

class InteractionDto implements Interaction {
  @IsString()
  @IsOptional()
  inputValue?: string;

  @IsArray()
  @IsOptional()
  selectedOptions?: Array<string>;

  @IsOptional()
  isChecked?: boolean;
}

export class ClickEventDataDto {
  @IsObject()
  coordinates: {
    x: number;
    y: number;
  };

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => TargetElementDto)
  targetElement?: TargetElementDto;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => PageContextDto)
  pageContext?: PageContextDto;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => InteractionDto)
  userInteraction?: InteractionDto;

  @IsObject()
  @IsOptional()
  additionalContext?: Record<string, unknown>;
}

export class CreateRecordingEventDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsNotEmpty()
  userId: string;

  @IsEnum(RecordingEventType)
  @IsNotEmpty()
  type: RecordingEventType;

  @IsObject()
  @IsNotEmpty()
  data: RecordingEventData;

  @IsNumber()
  @IsNotEmpty()
  timestamp: number;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
