import { diskStorage } from 'multer';
import { extname } from 'path';
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { RecordingsModule } from './recordings/recordings.module';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './storage/storage.module';
import { MediaModule } from './media/media.module';
import { TemplatesModule } from './templates/templates.module';
import { GuidesModule } from './guides/guides.module';
import { RecordingEventsModule } from './recording-events/recording-events.module';
import { MAX_UPLOADED_FILE_SIZE } from './recordings/recordings.constants';

@Module({
  imports: [
    RecordingsModule,
    RecordingEventsModule,
    DatabaseModule,
    StorageModule,
    MediaModule,
    TemplatesModule,
    GuidesModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: MAX_UPLOADED_FILE_SIZE,
      },
    }),
  ],
})

export class AppModule {}
