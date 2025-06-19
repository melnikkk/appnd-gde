import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recording } from './entities/recording.entity';
import { RecordingsService } from './services/recordings.service';
import { RecordingsController } from './controllers/recordings.controller';
import { StorageModule } from '../storage/storage.module';
import { RecordingCoreService } from './services/recording-core.service';
import { RecordingEventService } from './services/recording-event.service';
import { ScreenshotService } from './services/screenshot.service';
import { GuidesModule } from '../guides/guides.module';
import { EmbedCodeService } from './services/embed-code.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recording]),
    StorageModule,
    GuidesModule
  ],
  controllers: [RecordingsController],
  providers: [
    RecordingsService,
    RecordingCoreService,
    RecordingEventService,
    ScreenshotService,
    EmbedCodeService
  ],
  exports: [RecordingsService],
})
export class RecordingsModule {}
