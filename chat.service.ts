import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  async saveMessage(conversationId: string, senderId: string, content: string) {
    const message = this.messageRepository.create({
      conversationId,
      senderId,
      content,
      isRead: false
    });
    
    const savedMessage = await this.messageRepository.save(message);

    // Integration: Emit the message to everyone in the conversation room
    if (this.chatGateway.server) {
      this.chatGateway.server.to(conversationId).emit('newMessage', savedMessage);
    }

    return savedMessage;
  }

  async getConversationHistory(conversationId: string) {
    return this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
      relations: ['sender']
    });
  }
}