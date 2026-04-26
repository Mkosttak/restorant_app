import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitOrderUpdate(data: { action: string; order: unknown }) {
    this.server.emit('orderUpdate', data);
  }

  emitTableUpdate(data: { action: string; table: unknown }) {
    this.server.emit('tableUpdate', data);
  }

  emitNotification(data: { type: string; message: string; details?: unknown }) {
    this.server.emit('notification', data);
  }
}
