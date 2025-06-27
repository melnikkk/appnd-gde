import { RecordingEventDataDto } from '../dto/recording-event-data.dto';
import { GeneratedContentDto } from '../dto/generated-content.dto';

export interface AiService {
  generateRecordingEventsContent(
    eventsData: Array<RecordingEventDataDto>,
  ): Promise<Record<string, GeneratedContentDto>>;
}
