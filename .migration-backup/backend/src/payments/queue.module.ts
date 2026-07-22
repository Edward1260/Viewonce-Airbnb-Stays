import { Module } from '@nestjs/common';
import { BullMQModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebhookProcessor } from './webhook.processor';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    BullMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
        },
      }),
      inject: [ConfigService],
    }),
    BullMQModule.registerQueue({ name: 'webhooks' }),
    PaymentsModule, // Import PaymentsModule to use PaymentsService in the processor
  ],
  providers: [WebhookProcessor],
  exports: [BullMQModule], // Export BullMQModule to be used in other modules (e.g., PaymentsModule)
})
export class QueueModule {}