import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
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
          await client.join(payload.sub);
          this.logger.debug(`Client connected and joined user room: ${payload.sub}`);
        }
      }
    } catch (error) {
      // Token invalid or missing - connection allowed but no user room joined
    }
  }

  handleDisconnect(client: Socket) {
    // Cleanup if necessary
  }

  sendBookingUpdateToUser(userId: string, data: any) {
    this.server.to(userId).emit('bookingUpdate', data);
  }
}
