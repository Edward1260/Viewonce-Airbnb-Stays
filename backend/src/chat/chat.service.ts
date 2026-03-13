import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { responseMap, defaultResponses } from '../config/responses.config';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async saveMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
    const message = this.messageRepository.create({
      conversationId,
      senderId,
      content,
    });
    return this.messageRepository.save(message);
  }

  async getConversationHistory(conversationId: string): Promise<Message[]> {
    return this.messageRepository.find({
      where: { conversationId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });
  }

  generateResponse(userMessage: string): string {
    const message = userMessage.toLowerCase();

    for (const [keyword, responses] of Object.entries(responseMap)) {
      if (message.includes(keyword)) {
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  }
}
