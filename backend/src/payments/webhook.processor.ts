import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PaymentsService } from '../payments/payments.service';
import { Logger } from '@nestjs/common';

export enum WebhookJobType {
  STRIPE = 'stripe',
  MPESA_STK_CALLBACK = 'mpesa_stk_callback',
  MPESA_BALANCE_CALLBACK = 'mpesa_balance_callback',
  MPESA_B2C_CALLBACK = 'mpesa_b2c_callback',
  MPESA_B2C_TIMEOUT = 'mpesa_b2c_timeout',
}

export interface WebhookJobData {
  type: WebhookJobType;
  payload: any;
  signature?: string; // For Stripe
  rawBody?: Buffer; // For Stripe
}

@Processor('webhooks')
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly paymentsService: PaymentsService) {
    super();
  }

  async process(job: Job<WebhookJobData, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.data.type}`);
    const { type, payload, signature, rawBody } = job.data;

    try {
      switch (type) {
        case WebhookJobType.STRIPE:
          await this.paymentsService.handleStripeWebhook(signature, rawBody);
          break;
        case WebhookJobType.MPESA_STK_CALLBACK:
          await this.paymentsService.handleMpesaCallback(payload);
          break;
        case WebhookJobType.MPESA_BALANCE_CALLBACK:
          await this.paymentsService.handleBalanceCallback(payload);
          break;
        case WebhookJobType.MPESA_B2C_CALLBACK:
          await this.paymentsService.handleB2cPayoutCallback(payload);
          break;
        case WebhookJobType.MPESA_B2C_TIMEOUT:
          await this.paymentsService.handleB2cTimeoutCallback(payload);
          break;
        default:
          this.logger.warn(`Unknown webhook job type: ${type}`);
          throw new Error(`Unknown webhook job type: ${type}`);
      }
      this.logger.log(`Job ${job.id} of type ${type} completed successfully.`);
    } catch (error) {
      this.logger.error(`Job ${job.id} of type ${type} failed: ${error.message}`, error.stack);
      throw error; // Re-throw to mark the job as failed in BullMQ
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<WebhookJobData, any, string>, error: Error) {
    this.logger.error(`Job ${job.id} failed with error: ${error.message}`);
  }
}