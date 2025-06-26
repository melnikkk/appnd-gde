import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recording } from '../recordings/entities/recording.entity';
import { StorageModule } from '../storage/storage.module';
import { RecordingStoreService } from './services/recording-store.service';

@Module({
  imports: [TypeOrmModule.forFeature([Recording]), StorageModule],
  providers: [RecordingStoreService],
  exports: [RecordingStoreService],
})
export class RecordingsSharedModule {}
