import { Controller } from '@nestjs/common';
import { RecordingEventsService } from '../services/recording-events.service';

@Controller('recording-events')
export class RecordingEventsController {
  constructor(private readonly recordingEventsService: RecordingEventsService) {}
}
