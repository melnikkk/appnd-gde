import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RecordingsModule } from './recordings/recordings.module';

@Module({
  imports: [RecordingsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
