import { Module } from '@nestjs/common';
import { ScreenshotsService } from './services/screenshots.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [ScreenshotsService],
  exports: [ScreenshotsService],
})
export class ScreenshotsModule {}
