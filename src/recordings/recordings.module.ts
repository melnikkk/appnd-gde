import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recording } from './entities/recording.entity';
import { RecordingsService } from './services/recordings.service';
import { RecordingsController } from './controllers/recordings.controller';
import { StorageModule } from '../storage/storage.module';
import { RecordingCoreService } from './services/recording-core.service';
import { GuidesModule } from '../guides/guides.module';
import { EmbedCodeService } from './services/embed-code.service';
import { RecordingEventsModule } from '../recording-events/recording-events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recording]),
    StorageModule,
    GuidesModule,
    RecordingEventsModule
  ],
  controllers: [RecordingsController],
  providers: [
    RecordingsService,
    RecordingCoreService,
    EmbedCodeService
  ],
  exports: [RecordingsService],
})
export class RecordingsModule {}
