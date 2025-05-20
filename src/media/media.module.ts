import { forwardRef, Module } from '@nestjs/common';
import { MediaService } from './services/media.service';
import { StorageModule } from '../storage/storage.module';
import { MEDIA_PROCESSOR } from './interfaces/media-processor.interface.constants';

@Module({
  imports: [forwardRef(() => StorageModule)],
  providers: [
    {
      provide: MEDIA_PROCESSOR,
      useClass: MediaService,
    },
    MediaService,
  ],
  exports: [MEDIA_PROCESSOR, MediaService],
})
export class MediaModule {}
