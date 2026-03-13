import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

type AuthenticatedSocket = Socket & {
  userId?: string;
  userRole?: string;
};

@WebSocketGateway()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: AuthenticatedSocket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    console.log('Client disconnected:', client.id);
  }

  sendBookingUpdateToUser(userId: string, data: any) {
    this.server.to(userId).emit('bookingUpdate', data);
  }
}
