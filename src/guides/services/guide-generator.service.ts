import { Injectable, Logger } from '@nestjs/common';
import { TemplatesService } from '../../templates/templates.service';
import { Recording } from '../../recordings/entities/recording.entity';
import {
  RecordingEvent,
  RecordingEventsRecord,
} from '../../recordings/entities/recording-events.types';
import { RecordingEventType } from '../../recording-events/entities/recording-event.constants';
import { ClickRecordingEventData } from '../../recording-events/entities/recording-events.types';

interface GuideStep {
  title: string;
  description?: string;
  imageUrl: string | null;
  timestamp: number;
  events?: Array<RecordingEvent>;
}

@Injectable()
export class GuideGeneratorService {
  private readonly logger = new Logger(GuideGeneratorService.name);

  constructor(private readonly templatesService: TemplatesService) {}

  generateStepByStepGuide(
    recording: Recording,
    events: RecordingEventsRecord,
  ): Promise<string> {
    if (!events || Object.keys(events).length === 0) {
      return Promise.resolve(`<h1>Step Guide for ${recording.name}</h1>
              <p>This recording doesn't have any events to generate a guide from.</p>`);
    }

    const steps = this.convertEventsToGuideSteps(events);

    return this.templatesService.render('step-guide', {
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
        description: this.generateStepDescription(mainEvent),
      };

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
    switch (event.type) {
      case RecordingEventType.CLICK: {
        try {
          const clickData = event.data as unknown as ClickRecordingEventData;
          const coordinates = clickData?.coordinates;

          if (coordinates) {
            return `Click at position x: ${coordinates.x}, y: ${coordinates.y}`;
          }

          if (event.data && typeof event.data === 'object') {
            const data = event.data as Record<string, unknown>;
            
            if (data.x !== undefined && data.y !== undefined) {
              return `Click at position x: ${data.x}, y: ${data.y}`;
            }
          }
        } catch (error) {
          this.logger.error(`Error processing click event data: ${error.message}`);
        }

        return undefined;
      }
      default:
        return undefined;
    }
  }
}
