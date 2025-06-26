import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recording } from './entities/recording.entity';
import { RecordingsService } from './services/recordings.service';
import { RecordingsController } from './controllers/recordings.controller';
import { StorageModule } from '../storage/storage.module';
import { GuidesModule } from '../guides/guides.module';
import { EmbedCodeService } from './services/embed-code.service';
import { ScreenshotsModule } from '../screenshots/screenshots.module';
import { RecordingsSharedModule } from '../recordings-shared/recordings-shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recording]),
    StorageModule,
    GuidesModule,
    ScreenshotsModule,
    RecordingsSharedModule,
  ],
  controllers: [RecordingsController],
  providers: [RecordingsService, EmbedCodeService],
  exports: [RecordingsService],
})
export class RecordingsModule {}
