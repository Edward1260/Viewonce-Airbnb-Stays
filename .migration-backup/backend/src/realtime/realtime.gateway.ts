import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
@Injectable()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      let token = client.handshake.auth?.token || client.handshake.query?.token;
      if (Array.isArray(token)) token = token[0];

      if (token) {
        const payload = this.jwtService.verify(token);
        if (payload.sub) {
          client['user'] = payload;
          await client.join(payload.sub);
          this.logger.debug(`Client connected and joined user room: ${payload.sub}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Connection rejected for client ${client.id}: Invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('support:joinTicket')
  async handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    await client.join(`ticket:${data.ticketId}`);
    this.logger.debug(`Client ${client.id} joined ticket room: ${data.ticketId}`);
  }

  @SubscribeMessage('support:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string, isTyping: boolean },
  ) {
    const user = client['user'];
    client.to(`ticket:${data.ticketId}`).emit('support:userTyping', {
      ticketId: data.ticketId,
      isTyping: data.isTyping,
      userId: user?.sub || client.id,
    });
  }

  sendBookingUpdateToUser(userId: string, data: any) {
    this.server.to(userId).emit('bookingUpdate', data);
  }

  broadcastPropertyUpdate(data: any) {
    this.server.emit('propertyUpdate', data);
  }
}
