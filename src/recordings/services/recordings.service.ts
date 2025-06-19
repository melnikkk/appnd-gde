import { Injectable } from '@nestjs/common';
import { Recording } from '../entities/recording.entity';
import { CreateRecordingEventDto } from '../dto/create-recording-event.dto';
import { CreateRecordingDto } from '../dto/create-recording.dto';
import { RecordingEvent } from '../entities/recording-events.types';
import { RecordingCoreService } from './recording-core.service';
import { RecordingEventService } from './recording-event.service';
import { ScreenshotService } from './screenshot.service';
import { GuideGeneratorService } from '../../guides/services/guide-generator.service';
import { EmbedCodeService } from './embed-code.service';

@Injectable()
export class RecordingsService {
  constructor(
    private readonly recordingCoreService: RecordingCoreService,
    private readonly recordingEventService: RecordingEventService,
    private readonly screenshotService: ScreenshotService,
    private readonly guideGeneratorService: GuideGeneratorService,
    private readonly embedCodeService: EmbedCodeService,
  ) {}

  async create(
    createRecordingDto: CreateRecordingDto,
    file: Express.Multer.File,
  ): Promise<void> {
    await this.recordingCoreService.create(createRecordingDto, file);
  }

  async findAll(): Promise<Array<Recording>> {
    return this.recordingCoreService.findAll();
  }

  async findOne(id: string): Promise<Recording | null> {
    return this.recordingCoreService.findOne(id);
  }

  async getSignedUrl(id: string): Promise<string> {
    return this.recordingCoreService.getSignedUrl(id);
  }

  async remove(id: string): Promise<void> {
    await this.recordingEventService.deleteAllEventsByRecordingId(id);
    await this.screenshotService.deleteScreenshotsByRecordingId(id);

    return this.recordingCoreService.remove(id);
  }

  async addEvents(
    recordingId: string,
    events: Record<string, CreateRecordingEventDto>,
  ): Promise<Record<string, RecordingEvent>> {
    return this.recordingEventService.addEvents(recordingId, events);
  }

  formatEventsForResponse(
    events: Record<string, RecordingEvent>,
    recordingId: string,
  ): Record<string, RecordingEvent> {
    return this.recordingEventService.formatEventsForResponse(events, recordingId);
  }

  async getEventById(
    recordingId: string,
    eventId: string,
  ): Promise<RecordingEvent | null> {
    return this.recordingEventService.getEventById(recordingId, eventId);
  }

  async getAllEvents(recordingId: string): Promise<Record<string, RecordingEvent>> {
    return this.recordingEventService.getAllEventsByRecordingId(recordingId);
  }

  async deleteEvent(recordingId: string, eventId: string): Promise<void> {
    await this.recordingEventService.deleteEvent(recordingId, eventId);
  }

  async updateEvent(
    recordingId: string,
    eventId: string,
    updateEventDto: Partial<RecordingEvent>,
  ): Promise<RecordingEvent> {
    return this.recordingEventService.updateEvent(recordingId, eventId, updateEventDto);
  }

  async addEventScreenshot(
    recordingId: string,
    eventId: string,
    file: Express.Multer.File,
  ): Promise<RecordingEvent> {
    return this.recordingEventService.addEventScreenshot(recordingId, eventId, file);
  }

  getFilePath(key: string): string {
    return this.recordingCoreService.getFilePath(key);
  }

  getEventScreenshotPath(recordingId: string, eventId: string): string | null {
    return this.screenshotService.getEventScreenshotPath(recordingId, eventId);
  }

  async regenerateEventScreenshot(
    recordingId: string,
    eventId: string,
  ): Promise<RecordingEvent> {
    return this.recordingEventService.regenerateEventScreenshot(recordingId, eventId);
  }

  async generateRecordingEventsScreenshots(recordingId: string): Promise<void> {
    return this.recordingEventService.generateRecordingEventsScreenshots(recordingId);
  }

  async exportRecordingAsStepGuide(recordingId: string): Promise<string | null> {
    const recording = await this.findOne(recordingId);

    if (!recording) {
      return null;
    }

    return this.guideGeneratorService.generateStepByStepGuide(recording, recording.events);
  }

  async generateEmbedCode(recordingId: string, width?: string, height?: string): Promise<string | null> {
    const stepGuideContent = await this.exportRecordingAsStepGuide(recordingId);
    
    if (!stepGuideContent) {
      return null;
    }

    const encodedStepGuide = Buffer.from(stepGuideContent).toString('base64');
    const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`;

    return this.embedCodeService.generateEmbedCode({
      recordingId,
      width,
      height,
      serverUrl,
      encodedContent: encodedStepGuide,
    });
  }
}
