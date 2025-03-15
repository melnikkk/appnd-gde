import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebSocketService implements OnGatewayConnection {
  handleConnection(client: unknown) {
    console.log('=== Client connected ===');
  }

  @SubscribeMessage('test-event')
  handleEvent(@MessageBody() dto: object, @ConnectedSocket() client: unknown) {
    console.log(dto);
    // @ts-expect-error: not typed yet
    client.emit('test-emit-event', { type: 'test-event-request' });
  }
}
