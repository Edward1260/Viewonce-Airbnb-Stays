import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  async saveMessage(
    @Body() body: { conversationId: string; senderId: string; content: string },
  ) {
    const { conversationId, senderId, content } = body;
    const message = await this.chatService.saveMessage(conversationId, senderId, content);

    // Generate and save AI response if it's a user message
    if (content) {
      const response = this.chatService.generateResponse(content);
      await this.chatService.saveMessage(conversationId, 'ai', response);
    }

    return message;
  }

  @Get('messages/:conversationId')
  async getConversationHistory(@Param('conversationId') conversationId: string) {
    return this.chatService.getConversationHistory(conversationId);
  }
}
