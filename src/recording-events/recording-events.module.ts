import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordingEvent } from './entities/recording-event.entity';
import { RecordingEventsService } from './services/recording-events.service';
import { ScreenshotsModule } from '../screenshots/screenshots.module';
import { RecordingEventsController } from './controllers/recording-events.controller';
import { RecordingsSharedModule } from '../recordings-shared/recordings-shared.module';
import { RecordingEventAiService } from './services/recording-event-ai.service';
import { AiModule } from '../ai/ai.module';
import { RecordingEventFactoryService } from './services/recording-event-factory.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecordingEvent]),
    ScreenshotsModule,
    RecordingsSharedModule,
    AiModule,
  ],
  providers: [
    RecordingEventsService,
    RecordingEventAiService,
    RecordingEventFactoryService,
  ],
  exports: [
    RecordingEventsService,
    RecordingEventAiService,
    RecordingEventFactoryService,
  ],
  controllers: [RecordingEventsController],
})
export class RecordingEventsModule {}
