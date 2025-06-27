import { Injectable } from '@nestjs/common';
import { TemplatesService } from '../../templates/templates.service';
import { Recording } from '../../recordings/entities/recording.entity';
import {
  RecordingEvent,
  RecordingEventsRecord,
} from '../../recording-events/entities/recording-events.types';
import { RecordingEventType } from '../../recording-events/recording-event.constants';

interface GuideStep {
  title: string;
  description?: string;
  imageUrl: string | null;
  timestamp: number;
  events?: Array<RecordingEvent>;
}

@Injectable()
export class GuideGeneratorService {
  constructor(private readonly templatesService: TemplatesService) {}

  async generateStepByStepGuide(
    recording: Recording,
    events: RecordingEventsRecord,
  ): Promise<string> {
    const steps = this.convertEventsToGuideSteps(events);

    return await this.templatesService.render('step-guide', {
      steps,
      title: `How to ${recording.name}`,
      description:
        'This guide will help you understand how to perform this task step by step.',
      icon: null,
      footerText: `Generated from recording "${recording.name}"`,
    });
  }

  private convertEventsToGuideSteps(events: RecordingEventsRecord): Array<GuideStep> {
    const eventsArray: Array<RecordingEvent> = Object.values(events);
    const sortedEvents = eventsArray.sort((a, b) => a.timestamp - b.timestamp);
    const screenshotEvents = sortedEvents.filter((event) => event.screenshotUrl);

    return screenshotEvents.map((mainEvent, index) => {
      const nextScreenshotEvent = screenshotEvents[index + 1];
      const nextTimestamp = nextScreenshotEvent
        ? nextScreenshotEvent.timestamp
        : Infinity;

      const relatedEvents = sortedEvents.filter(
        (event) =>
          event.timestamp >= mainEvent.timestamp && event.timestamp < nextTimestamp,
      );

      const step: GuideStep = {
        title: this.generateStepTitle(mainEvent, index),
        timestamp: mainEvent.timestamp,
        imageUrl: mainEvent.screenshotUrl ?? null,
        events: relatedEvents,
      };

      step.description = this.generateStepDescription(mainEvent);

      return step;
    });
  }

  private generateStepTitle(event: RecordingEvent, index: number): string {
    switch (event.type) {
      case RecordingEventType.CLICK:
        return `Click on element`;
      default:
        return `Step ${index + 1}`;
    }
  }

  private generateStepDescription(event: RecordingEvent): string | undefined {
    if (event.type === RecordingEventType.CLICK) {
      const coordinates = event.data?.coordinates;

      if (coordinates) {
        return `Click at position x: ${coordinates.x}, y: ${coordinates.y}`;
      }

      return undefined;
    }
    return undefined;
  }
}
