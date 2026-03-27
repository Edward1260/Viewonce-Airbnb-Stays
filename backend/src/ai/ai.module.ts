import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { User } from '../entities/user.entity';
import { Booking } from '../entities/booking.entity';
import { Property } from '../entities/property.entity';
import { AiConversation } from '../entities/ai-conversation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Booking, Property, AiConversation]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
