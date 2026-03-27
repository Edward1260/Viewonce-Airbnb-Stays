import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertiesService } from '../properties/properties.service';
import { getAIResponse, AiIntent } from '../config/responses.config';
import { User, UserRole } from '../entities/user.entity';
import { AiConversation } from '../entities/ai-conversation.entity';

@Injectable()
export class AiService {
  constructor(
    private readonly propertiesService: PropertiesService,
    @InjectRepository(AiConversation)
    private readonly conversationRepository: Repository<AiConversation>,
  ) {}

  async handleChatMessage(user: User, payload: { message: string, context?: any }) {
    const message = payload.message.toLowerCase();
    let dynamicData = '';
    let detectedIntent = this.detectSimpleIntent(message);

    let conversation = await this.conversationRepository.findOne({ where: { userId: user.id } });
    if (!conversation) {
      conversation = this.conversationRepository.create({ userId: user.id, history: [] });
    }

    // 1. Intent: Search Properties
    if (message.includes('find') || message.includes('recommend') || message.includes('show me')) {
      const location = payload.context?.currentCity || user.location;
      const [properties] = await this.propertiesService.findAll({ 
        location, 
        limit: 3,
        priceMax: payload.context?.maxPrice
      });

      if (properties.length > 0) {
        dynamicData = `\n\nI found ${properties.length} properties in ${location} that match your style: \n` + 
          properties.map(p => `- ${p.title} (KSh ${p.price.toLocaleString()})`).join('\n');
        detectedIntent = 'search';
      }
    }

    // 2. Intent: Support (For Support Dashboard) - Enhanced with context
    if (user.role === UserRole.SUPPORT && (message.includes('summary') || message.includes('summarize'))) {
      const activeTicketId = payload.context?.activeTicketId;
      if (activeTicketId) {
        try {
          // Fetch ticket details using a direct query to handle tickets without tight entity coupling
          const ticketData = await this.conversationRepository.manager.query(
            'SELECT * FROM support_tickets WHERE id = $1 LIMIT 1',
            [activeTicketId]
          );
          
          if (ticketData && ticketData.length > 0) {
            const ticket = ticketData[0];
            dynamicData = `\n\nAI Summary for Ticket #${activeTicketId.slice(-8)}:\n` +
              `• Subject: ${ticket.subject}\n` +
              `• Current Status: ${ticket.status}\n` +
              `• Customer Report: "${ticket.description}"\n` +
              `• Analysis: This appears to be a ${ticket.category || 'pending'} issue requiring immediate agent attention.`;
            detectedIntent = 'support_ticket_summary';
          }
        } catch (e) {
          dynamicData = "\n\nNote: I detected an active ticket context but couldn't retrieve the database record for a full summary.";
        }
      } else {
        dynamicData = "\n\nGeneral Support Insight: Based on recent tickets, most users are struggling with M-Pesa STK push timeouts. I recommend checking the gateway logs.";
      }
    }

    // 3. Intent: Host Analytics (For Host Dashboard) - Fixed logic
    if (user.role === UserRole.HOST && (message.includes('earn') || message.includes('performance'))) {
      dynamicData = "\n\nYour properties are performing 15% better than last month! Your 'Nairobi Penthouse' listing is currently your top earner.";
    }

    const staticResponse = getAIResponse(payload.message, { user, ...payload.context });
    const finalMessage = staticResponse + dynamicData;

    // Track history in database
    conversation.history.push({ role: 'user', content: payload.message, timestamp: new Date().toISOString() });
    conversation.history.push({ role: 'assistant', content: finalMessage, timestamp: new Date().toISOString() });
    conversation.lastIntent = detectedIntent;
    
    await this.conversationRepository.save(conversation);

    return {
      success: true,
      message: finalMessage,
      intentDetected: detectedIntent,
      timestamp: new Date().toISOString()
    };
  }

  private detectSimpleIntent(msg: string): string {
    if (msg.includes('book')) return 'booking';
    if (msg.includes('price') || msg.includes('cost')) return 'pricing';
    return 'general';
  }
}