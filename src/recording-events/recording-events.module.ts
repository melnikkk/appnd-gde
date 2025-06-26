import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordingEvent } from './entities/recording-event.entity';
import { RecordingEventsService } from './services/recording-events.service';
import { ScreenshotsModule } from '../screenshots/screenshots.module';
import { RecordingEventsController } from './controllers/recording-events.controller';
import { RecordingsSharedModule } from '../recordings-shared/recordings-shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecordingEvent]),
    ScreenshotsModule,
    RecordingsSharedModule,
  ],
  providers: [RecordingEventsService],
  exports: [RecordingEventsService],
  controllers: [RecordingEventsController],
})
export class RecordingEventsModule {}
