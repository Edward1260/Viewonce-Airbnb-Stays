import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(@Body() chatDto: { message: string; context: any }, @Request() req) {
    // Injecting user information from the request into the context for personalized responses
    return this.aiService.generateResponse(chatDto.message, { ...chatDto.context, user: req.user });
  }
}