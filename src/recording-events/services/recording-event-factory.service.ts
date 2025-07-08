import { Injectable } from '@nestjs/common';
import { BaseRecordingEvent } from '../models/base-recording-event.model';
import { RecordingEvent } from '../entities/recording-events.types';
import { RecordingEventModels } from '../models/recording-event-models';

@Injectable()
export class RecordingEventFactoryService {
  createRecordingEvent(event: RecordingEvent): BaseRecordingEvent {
    const RecordingEventModel = RecordingEventModels[event.type];

    if (!RecordingEventModel) {
      throw new Error(`Unknown recording event type: ${event.type}`);
    }

    return new RecordingEventModel(event);
  }

  createRecordingEvents(events: Array<RecordingEvent>): Array<BaseRecordingEvent> {
    return events.map((event) => this.createRecordingEvent(event));
  }
}
