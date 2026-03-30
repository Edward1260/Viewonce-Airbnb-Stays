import { Injectable } from '@nestjs/common';
import { getAIResponse } from '../config/responses.config';

@Injectable()
export class AiService {
  async generateResponse(message: string, context: any) {
    const reply = getAIResponse(message, context);
    return {
      reply,
      timestamp: new Date().toISOString(),
    };
  }
}