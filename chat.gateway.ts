import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/ws-jwt.guard'; // Assuming a WebSocket JWT guard exists

@WebSocketGateway({ 
  cors: true, 
  namespace: 'chat' 
})
@UseGuards(WsJwtGuard)
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  // In a real application, inject your ChatService to perform DB checks
  // constructor(private readonly chatService: ChatService) {}

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(@MessageBody() data: { conversationId: string }, @ConnectedSocket() client: Socket) {
    // 1. Retrieve the authenticated user from the socket
    // Note: WsJwtGuard usually attaches the decoded token to client.user or client.handshake.user
    const user = (client as any).user;
    const userId = user?.id || user?.sub;

    // 2. Perform the membership check
    // Example: const isMember = await this.chatService.checkMembership(userId, data.conversationId);
    const isMember = true; // Placeholder for actual database logic

    if (!isMember) {
      throw new WsException('Forbidden: You are not a participant in this conversation.');
    }

    client.join(data.conversationId);
    console.log(`User ${userId} joined room: ${data.conversationId}`);
  }
}