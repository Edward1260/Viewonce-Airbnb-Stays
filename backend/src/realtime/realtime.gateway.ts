import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/realtime',
})
@Injectable()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private connectedClients = new Map<string, AuthenticatedSocket>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    try {
      const token = client.handshake.auth.token || client.handshake.query.token as string;

      if (!token) {
        this.logger.warn(`WebSocket connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.userRole = payload.role;

      this.connectedClients.set(client.id, client);
      this.logger.log(`WebSocket client connected: ${client.id} (User: ${client.userId}, Role: ${client.userRole})`);

      // Join user-specific room for targeted notifications
      client.join(`user-${client.userId}`);

      // Join role-specific room
      client.join(`role-${client.userRole}`);

    } catch (error) {
      this.logger.error(`WebSocket connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`WebSocket client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit('pong');
  }

  // Send notification to specific user
  async sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user-${userId}`).emit('notification', notification);
  }

  // Send booking update to specific user (host)
  async sendBookingUpdateToUser(userId: string, bookingData: any) {
    this.server.to(`user-${userId}`).emit('booking-update', bookingData);
  }

  // Broadcast to all hosts
  async broadcastToHosts(event: string, data: any) {
    this.server.to('role-host').emit(event, data);
  }

  // Broadcast to all customers
  async broadcastToCustomers(event: string, data: any) {
    this.server.to('role-customer').emit(event, data);
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}
