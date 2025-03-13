import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebSocketService } from './websocket/websocket.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, WebSocketService],
})
export class AppModule {}
