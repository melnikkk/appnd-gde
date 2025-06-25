import { Module } from '@nestjs/common';
import { RecordingEventsService } from './services/recording-events.service';
import { ScreenshotService } from './services/screenshot.service';
import { StorageModule } from '../storage/storage.module';
import { RecordingEventsController } from './controllers/recording-events.controller';

@Module({
  imports: [StorageModule],
  controllers: [RecordingEventsController],
  providers: [RecordingEventsService, ScreenshotService],
  exports: [RecordingEventsService, ScreenshotService],
})
export class RecordingEventsModule {}
