import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recording } from './entities/recording.entity';
import { RecordingEvent } from './entities/recording-event.entity';
import { RecordingsService } from './services/recordings.service';
import { RecordingsController } from './controllers/recordings.controller';
import { LocalStorageService } from './services/storage/local-storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Recording, RecordingEvent])],
  controllers: [RecordingsController],
  providers: [RecordingsService, LocalStorageService],
  exports: [RecordingsService],
})
export class RecordingsModule {}
