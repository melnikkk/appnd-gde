import { Injectable } from '@nestjs/common';
import { TemplatesService } from '../../templates/templates.service';
import { Recording } from '../../recordings/entities/recording.entity';
import {
  RecordingEvent,
  RecordingEventsRecord,
} from '../../recordings/entities/recording-events.types';
import { RecordingEventType } from '../../recordings/entities/recording-event.constants';

interface GuideStep {
  title: string;
  description?: string;
  imageUrl?: string;
  timestamp: number;
}

@Injectable()
export class GuideGeneratorService {
  constructor(private readonly templatesService: TemplatesService) {}

  async generateStepByStepGuide(
    recording: Recording,
    events: RecordingEventsRecord,
  ): Promise<string> {
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

  private convertEventsToGuideSteps(events: RecordingEventsRecord): GuideStep[] {
    const eventsArray: RecordingEvent[] = Object.values(events);
    const sortedEvents = eventsArray.sort((a, b) => a.timestamp - b.timestamp);

    return (
      sortedEvents
        .filter((event) => event.screenshotUrl)
        .map((event, index) => {
          const step: GuideStep = {
            title: this.generateStepTitle(event, index),
            timestamp: event.timestamp,
            imageUrl: event.screenshotUrl || undefined,
          };

          step.description = this.generateStepDescription(event);

          return step;
        })
    );
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
      case RecordingEventType.CLICK:
        const coordinates = event.data?.coordinates;
        if (coordinates) {
          return `Click at position x: ${coordinates.x}, y: ${coordinates.y}`;
        }
        return undefined;
      default:
        return undefined;
    }
  }
}
