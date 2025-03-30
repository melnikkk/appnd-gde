import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recording } from './entities/recording.entity';
import { RecordingsService } from './recordings.service';
import { RecordingsController } from './recordings.controller';
import { LocalStorageService } from './services/local-storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Recording])],
  controllers: [RecordingsController],
  providers: [RecordingsService, LocalStorageService],
  exports: [RecordingsService],
})
export class RecordingsModule {}
