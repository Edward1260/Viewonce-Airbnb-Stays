import * as crypto from 'crypto';
import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { HttpService } from '@nestjs/axios';
import { Repository, Like, ILike, LessThan } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { Payment, TransactionType, TransactionStatus } from '../entities/payment.entity';
import { Queue } from 'bullmq';
import { Refund, RefundStatus } from '../entities/refund.entity';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { User, UserRole } from '../entities/user.entity';
import { Property } from '../entities/property.entity';
import { Payout, PayoutStatus } from '../entities/payout.entity';
import { NotificationType } from '../entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
import { WebhookJobType } from '../queue/webhook.processor';
import { MPESA_CONFIG, MPESA_RESULT_CODES } from './mpesa.constants';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
    @InjectRepository(Payout)
    private payoutRepository: Repository<Payout>,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    private httpService: HttpService,
    private configService: ConfigService,
    @InjectQueue('webhooks')
    private webhooksQueue: Queue,
  ) {
    // Initialize Stripe
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2025-12-15.clover',
      });
    }
  }

  // ==================== PAYMENT METHODS ====================

  // Create Stripe Payment Intent
  async createPaymentIntent(bookingId: string, amount: number) {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          bookingId,
          userId: booking.userId,
        },
      });

      // Create payment record
      const payment = this.paymentRepository.create({
        bookingId,
        userId: booking.userId,
        type: TransactionType.PAYMENT,
        amount,
        status: TransactionStatus.PENDING,
        reference: paymentIntent.id,
        gatewayResponse: JSON.stringify(paymentIntent),
      });

      await this.paymentRepository.save(payment);

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        payment,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to create payment intent: ${error.message}`);
    }
  }

  // Process Payment
  async processPayment(paymentIntentId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { reference: paymentIntentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        payment.status = TransactionStatus.COMPLETED;
        payment.gatewayResponse = JSON.stringify(paymentIntent);
        await this.paymentRepository.save(payment);

        // Update booking payment status
        await this.bookingRepository.update(payment.bookingId, {
          paymentStatus: 'paid',
          status: BookingStatus.CONFIRMED,
        });

        // Send notification
        await this.notificationsService.create(
          payment.userId,
          'Payment Successful',
          `Your payment of $${payment.amount} has been processed successfully.`,
          NotificationType.PAYMENT_RECEIVED,
        );

        return { success: true, payment };
      } else {
        payment.status = TransactionStatus.FAILED;
        payment.gatewayResponse = JSON.stringify(paymentIntent);
        await this.paymentRepository.save(payment);

        throw new BadRequestException('Payment not completed');
      }
    } catch (error) {
      payment.status = TransactionStatus.FAILED;
      payment.gatewayResponse = error.message;
      await this.paymentRepository.save(payment);
      throw error;
    }
  }

  // Moved to WebhookProcessor for async processing
  // The controller will now enqueue this job
  async processStripeWebhook(signature: string, rawBody: Buffer) {
    // This method will be called by the WebhookProcessor
    // The original logic from handleStripeWebhook will be here
    if (!this.stripe) throw new BadRequestException('Stripe not configured');
    
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.processPayment(paymentIntent.id);
        break;
      case 'payment_intent.payment_failed':
        // Logic for failed payment
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return { received: true };
  }

  // Process Card Payment (Stripe)
  async processCardPayment(bookingId: string, paymentMethodId: string, amount: number) {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        payment_method: paymentMethodId,
        confirm: true,
        metadata: {
          bookingId,
          userId: booking.userId,
        },
      });

      // Create payment record
      const payment = this.paymentRepository.create({
        bookingId,
        userId: booking.userId,
        type: TransactionType.PAYMENT,
        amount,
        status: paymentIntent.status === 'succeeded' ? TransactionStatus.COMPLETED : TransactionStatus.PENDING,
        reference: paymentIntent.id,
        gatewayResponse: JSON.stringify(paymentIntent),
      });

      await this.paymentRepository.save(payment);

      if (paymentIntent.status === 'succeeded') {
        await this.bookingRepository.update(bookingId, {
          paymentStatus: 'paid',
          status: BookingStatus.CONFIRMED,
        });
      }

      return { success: paymentIntent.status === 'succeeded', payment };
    } catch (error) {
      throw new BadRequestException(`Card payment failed: ${error.message}`);
    }
  }

  // Verify Card Payment
  async verifyCardPayment(paymentId: string) {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(payment.reference);
      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
      };
    } catch (error) {
      throw new BadRequestException(`Verification failed: ${error.message}`);
    }
  }

  // ==================== PAYPAL PAYMENTS ====================

  // Create PayPal Payment
  async createPayPalPayment(bookingId: string, amount: number) {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Create payment record with pending status
    const payment = this.paymentRepository.create({
      bookingId,
      userId: booking.userId,
      type: TransactionType.PAYMENT,
      amount,
      status: TransactionStatus.PENDING,
      reference: `PAYPAL-${Date.now()}`,
    });

    await this.paymentRepository.save(payment);

    // In a real implementation, this would create a PayPal order
    // For now, return a mock approval URL
    return {
      approvalUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${payment.reference}`,
      paymentId: payment.id,
    };
  }

  // Capture PayPal Payment
  async capturePayPalPayment(paymentId: string) {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // In a real implementation, this would capture the PayPal payment
    payment.status = TransactionStatus.COMPLETED;
    await this.paymentRepository.save(payment);

    // Update booking
    await this.bookingRepository.update(payment.bookingId, {
      paymentStatus: 'paid',
      status: BookingStatus.CONFIRMED,
    });

    return { success: true, payment };
  }

  // ==================== BANK TRANSFER ====================

  // Create Bank Transfer Payment
  async createBankTransferPayment(bookingId: string, amount: number) {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Generate unique reference
    const reference = `BT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const payment = this.paymentRepository.create({
      bookingId,
      userId: booking.userId,
      type: TransactionType.PAYMENT,
      amount,
      status: TransactionStatus.PENDING,
      reference,
      notes: 'Bank transfer pending',
    });

    await this.paymentRepository.save(payment);

    return {
      reference,
      instructions: {
        bankName: 'Example Bank',
        accountName: 'ViewOnce Airbnb Stays',
        accountNumber: '1234567890',
        routingNumber: '987654321',
        reference: reference,
      },
      payment,
    };
  }

  // Verify Bank Transfer
  async verifyBankTransfer(paymentId: string, reference: string) {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // In a real implementation, this would verify with bank API
    payment.status = TransactionStatus.COMPLETED;
    payment.reference = reference;
    await this.paymentRepository.save(payment);

    await this.bookingRepository.update(payment.bookingId, {
      paymentStatus: 'paid',
      status: BookingStatus.CONFIRMED,
    });

    return { success: true, payment };
  }

  // Get Bank Transfer Instructions
  async getBankTransferInstructions(bookingId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { bookingId, type: TransactionType.PAYMENT },
      order: { createdAt: 'DESC' },
    });

    if (!payment) {
      throw new NotFoundException('No pending bank transfer found');
    }

    return {
      reference: payment.reference,
      instructions: {
        bankName: 'Example Bank',
        accountName: 'ViewOnce Airbnb Stays',
        accountNumber: '1234567890',
        routingNumber: '987654321',
        reference: payment.reference,
      },
    };
  }

  // ==================== M-PESA PAYMENTS ====================

  private async getMpesaToken(): Promise<string> {
    const consumerKey = this.configService.get('MPESA_CONSUMER_KEY') || MPESA_CONFIG.CONSUMER_KEY;
    const consumerSecret = this.configService.get('MPESA_CONSUMER_SECRET') || MPESA_CONFIG.CONSUMER_SECRET;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    try {
      const response = await firstValueFrom(
        this.httpService.get(MPESA_CONFIG.OAUTH_TOKEN_URL, {
          headers: { Authorization: `Basic ${auth}` },
        })
      );
      return response.data.access_token;
    } catch (error) {
      throw new BadRequestException('Failed to generate M-Pesa token');
    }
  }

  /**
   * Encrypts the Initiator Password using the Safaricom Public Key.
   * This is required for the B2C SecurityCredential in production.
   */
  private generateSecurityCredential(initiatorPassword: string): string {
    // The public key string should be the content of the .cer/.pem file provided by Safaricom
    const publicKey = this.configService.get('MPESA_PUBLIC_KEY');
    if (!publicKey) return initiatorPassword; // Fallback for sandbox if no key provided

    const buffer = Buffer.from(initiatorPassword);
    const encrypted = crypto.publicEncrypt({
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    }, buffer);

    return encrypted.toString('base64');
  }

  /**
   * Initiates a request to check the M-Pesa B2C shortcode balance.
   * Note: The result is sent asynchronously to the BALANCE_RESULT_URL.
   */
  async checkAccountBalance() {
    const token = await this.getMpesaToken();
    const initiatorPassword = this.configService.get('MPESA_INITIATOR_PASSWORD');
    const securityCredential = initiatorPassword 
      ? this.generateSecurityCredential(initiatorPassword)
      : (this.configService.get('MPESA_SECURITY_CREDENTIAL') || MPESA_CONFIG.SECURITY_CREDENTIAL);

    const payload = {
      Initiator: this.configService.get('MPESA_INITIATOR_NAME') || MPESA_CONFIG.INITIATOR_NAME,
      SecurityCredential: securityCredential,
      CommandID: 'AccountBalance',
      PartyA: this.configService.get('MPESA_B2C_SHORTCODE') || MPESA_CONFIG.B2C_SHORTCODE,
      IdentifierType: '4', // 4 for Organization Shortcode
      Remarks: 'Checking float balance for payouts',
      QueueTimeOutURL: MPESA_CONFIG.BALANCE_TIMEOUT_URL,
      ResultURL: MPESA_CONFIG.BALANCE_RESULT_URL,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(MPESA_CONFIG.BALANCE_URL, payload, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      return response.data;
    } catch (error) {
      throw new BadRequestException(`Balance check failed: ${error.response?.data?.errorMessage || error.message}`);
    }
  }

  /**
   * Handles the balance response from Safaricom.
   * Typically logs the balance or updates a dashboard/cache.
   */
  async handleBalanceCallback(callbackData: any) {
    const { Result } = callbackData;
    if (!Result || Result.ResultCode !== MPESA_RESULT_CODES.SUCCESS) {
      console.error('M-Pesa Balance Callback Failed:', Result?.ResultDesc);
      return { success: false };
    }

    // ResultParameters contains the balance strings
    // Balance is usually in the format: "Working Account|KES|1000.00|..."
    const balanceInfo = Result.ResultParameters.ResultParameter.find(p => p.Key === 'AccountBalance')?.Value;
    
    console.log(`Current M-Pesa B2C Balance: ${balanceInfo}`);
    
    // Optional: Store this in a settings/config table for UI display
    return { success: true, balance: balanceInfo };
  }

  /**
   * Scheduled job to retry failed payouts every 6 hours.
   * Only retries payouts that haven't been manually cancelled or disputed.
   */
  @Cron('0 */6 * * *')
  async retryFailedPayoutsJob() {
    console.log('[Cron] Checking for failed payouts to retry...');
    
    const failedPayouts = await this.payoutRepository.find({
      where: { 
        status: PayoutStatus.FAILED as any,
        retryCount: LessThan(3)
      },
      relations: ['host']
    });

    for (const payout of failedPayouts) {
      try {
        console.log(`[Cron] Retrying Payout ID: ${payout.id}`);
        await this.retryB2cPayout(payout.id);
      } catch (error) {
        console.error(`[Cron] Retry failed for Payout ${payout.id}:`, error.message);
      }
    }
  }

  // Initiate M-Pesa Payment
  async initiateMpesaPayment(bookingId: string, phoneNumber: string, amount: number) {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const token = await this.getMpesaToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const shortCode = this.configService.get('MPESA_SHORTCODE') || MPESA_CONFIG.SHORTCODE;
    const passkey = this.configService.get('MPESA_PASSKEY') || MPESA_CONFIG.PASSKEY;
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
    
    // Clean phone number (remove +, ensure 254 format)
    const formattedPhone = phoneNumber.replace('+', '').replace(/^0/, '254');

    const stkPayload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: shortCode,
      PhoneNumber: formattedPhone,
      CallBackURL: this.configService.get('MPESA_CALLBACK_URL') || MPESA_CONFIG.CALLBACK_URL,
      AccountReference: `BOOKING-${bookingId}`,
      TransactionDesc: `Stay at ${bookingId}`,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(MPESA_CONFIG.STK_PUSH_URL, stkPayload, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      const payment = this.paymentRepository.create({
        bookingId,
        userId: booking.userId,
        type: TransactionType.PAYMENT,
        amount,
        status: TransactionStatus.PENDING,
        reference: response.data.CheckoutRequestID,
        gatewayResponse: JSON.stringify(response.data),
        notes: `M-Pesa STK Push initiated for ${phoneNumber}`,
      });

      await this.paymentRepository.save(payment);

      return {
        transactionId: response.data.CheckoutRequestID,
        status: 'pending',
        message: 'STK push sent to your phone',
      };
    } catch (error) {
      throw new BadRequestException(`M-Pesa initiation failed: ${error.response?.data?.errorMessage || error.message}`);
    }
  }

  // Handle M-Pesa Callback (Webhook)
  async processMpesaCallback(callbackData: any) {
    const { Body } = callbackData;
    if (!Body || !Body.stkCallback) return { success: false };

    const { CheckoutRequestID, ResultCode, ResultDesc } = Body.stkCallback;
    const payment = await this.paymentRepository.findOne({ where: { reference: CheckoutRequestID } });

    if (!payment) return { success: false };

    if (ResultCode === MPESA_RESULT_CODES.SUCCESS) {
      payment.status = TransactionStatus.COMPLETED;
      payment.gatewayResponse = JSON.stringify(callbackData);
      await this.paymentRepository.save(payment);

      // Update booking to escrow state
      await this.bookingRepository.update(payment.bookingId, {
        paymentStatus: 'paid', // Logic: 'paid' implies money is in platform escrow
        status: BookingStatus.CONFIRMED,
      });

      await this.notificationsService.create(
        payment.userId,
        'Payment Successful',
        `Your M-Pesa payment for booking ${payment.bookingId} was successful.`,
        NotificationType.PAYMENT_RECEIVED,
      );
    } else {
      payment.status = TransactionStatus.FAILED;
      payment.notes = ResultDesc;
      await this.paymentRepository.save(payment);
    }

    return { success: true };
  }

  // Process Host Payout (M-Pesa B2C)
  async processHostPayout(bookingId: string) {
    const booking = await this.bookingRepository.findOne({ 
      where: { id: bookingId }, 
      relations: ['property', 'property.host'] 
    });
    
    if (!booking || !booking.property.host) throw new NotFoundException('Booking or Host not found');

    const commissionRate = 0.08;
    const totalAmount = booking.totalPrice;
    const commission = totalAmount * commissionRate;
    // Ensure accurate integer calculation for M-Pesa B2C
    const netAmount = Math.floor(totalAmount - commission);
    const actualCommission = totalAmount - netAmount;

    const payout = this.payoutRepository.create({
      bookingId,
      hostId: booking.property.hostId,
      amount: totalAmount,
      commission: actualCommission,
      netAmount: netAmount,
      status: PayoutStatus.PENDING,
      // Generate a unique ID for this specific attempt to prevent double payouts at Safaricom's end
      reference: `B2C_${bookingId}_${Date.now()}`
    });
    await this.payoutRepository.save(payout);

    // Pass the host relation to ensure the transfer uses the registered account
    payout.host = booking.property.host;
    return this.performB2cTransfer(payout);
  }

  /**
   * Shared logic for performing the actual B2C request to Safaricom
   * This method strictly pulls the destination from the host's registered profile.
   */
  private async performB2cTransfer(payout: Payout) {
    const token = await this.getMpesaToken();
    
    if (!payout.host || !payout.host.phone) {
      throw new BadRequestException('Host does not have a registered phone number for payout.');
    }

    const hostPhone = payout.host.phone.replace('+', '').replace(/^0/, '254');
    
    const initiatorPassword = this.configService.get('MPESA_INITIATOR_PASSWORD');
    const securityCredential = initiatorPassword 
      ? this.generateSecurityCredential(initiatorPassword)
      : (this.configService.get('MPESA_SECURITY_CREDENTIAL') || MPESA_CONFIG.SECURITY_CREDENTIAL);

    const b2cPayload = {
      InitiatorName: this.configService.get('MPESA_INITIATOR_NAME') || MPESA_CONFIG.INITIATOR_NAME,
      SecurityCredential: securityCredential,
      CommandID: 'BusinessPayment',
      Amount: payout.netAmount,
      PartyA: this.configService.get('MPESA_B2C_SHORTCODE') || MPESA_CONFIG.B2C_SHORTCODE,
      PartyB: hostPhone,
      Remarks: `Payout for Booking ${payout.bookingId}`,
      QueueTimeOutURL: MPESA_CONFIG.B2C_TIMEOUT_URL,
      ResultURL: MPESA_CONFIG.B2C_RESULT_URL,
      Occasion: 'HostPayout',
      // Use the unique reference as OriginatorConversationID for idempotency
      OriginatorConversationID: payout.reference,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(MPESA_CONFIG.B2C_URL, b2cPayload, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      payout.gatewayResponse = JSON.stringify(response.data);
      await this.payoutRepository.save(payout);

      return { success: true, message: 'Payout initiated' };
    } catch (error) {
      payout.status = PayoutStatus.FAILED;
      payout.gatewayResponse = JSON.stringify(error.response?.data || error.message);
      await this.payoutRepository.save(payout);
      throw new BadRequestException('B2C Payout failed');
    }
  }

  // Admin: Retry Failed Payout
  async retryB2cPayout(payoutId: string) {
    const payout = await this.payoutRepository.findOne({ 
      where: { id: payoutId },
      relations: ['host']
    });

    if (!payout) throw new NotFoundException('Payout record not found');
    if (payout.status !== PayoutStatus.FAILED) {
      throw new BadRequestException('Only failed payouts can be retried');
    }

    payout.status = PayoutStatus.PENDING;
    payout.retryCount += 1;
    payout.reference = `B2C_${payout.bookingId}_RETRY_${payout.retryCount}_${Date.now()}`;
    payout.adminNotes = (payout.adminNotes || '') + `\n[RETRY] Attempted on ${new Date().toISOString()}`;
    await this.payoutRepository.save(payout);

    return this.performB2cTransfer(payout);
  }

  /**
   * Checker: Admin approves a pending phone update requested by Support.
   * This is the only point where the active phone number is modified.
   */
  async approveHostPhoneUpdate(userId: string, adminId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId, role: UserRole.HOST } });
    if (!user) {
      throw new NotFoundException('Host not found');
    }

    const newPhone = (user as any).pendingPhoneUpdate;
    if (!newPhone) {
      throw new BadRequestException('No pending phone update request found for this host.');
    }

    const oldPhone = user.phone;
    user.phone = newPhone;
    
    // Clear pending state
    (user as any).pendingPhoneUpdate = null;
    (user as any).phoneUpdateRequestedBy = null;
    (user as any).phoneUpdateApprovedBy = adminId;
    (user as any).adminNotes = (user as any).adminNotes || '' + `\n[SECURITY] Phone updated from ${oldPhone} to ${newPhone} by Admin ${adminId}`;

    return this.userRepository.save(user);
  }

  // Admin: Reschedule a failed payout by resetting the retry counter
  async reschedulePayout(payoutId: string) {
    const payout = await this.payoutRepository.findOne({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout record not found');

    payout.retryCount = 0;
    payout.adminNotes = (payout.adminNotes || '') + `\n[SYSTEM] Retry counter reset by admin on ${new Date().toISOString()}`;
    await this.payoutRepository.save(payout);

    return { success: true, message: 'Payout rescheduled. Automated retries will resume.' };
  }

  // Handle M-Pesa B2C Callback
  async processB2cPayoutCallback(callbackData: any) {
    const { Result } = callbackData;
    if (!Result) return { success: false };

    const { ConversationID, OriginatorConversationID, ResultCode, ResultDesc, TransactionID } = Result;
    
    // Security: Find payout by OriginatorConversationID to ensure we match the specific attempt
    const payout = await this.payoutRepository.findOne({ 
      where: { reference: OriginatorConversationID } 
    });

    if (!payout) return { success: false };
    
    // Security: Prevent processing if already completed
    if (payout.status === PayoutStatus.COMPLETED) return { success: true };

    if (ResultCode === MPESA_RESULT_CODES.SUCCESS) {
      payout.status = PayoutStatus.COMPLETED;
      payout.processedAt = new Date();
      payout.gatewayResponse = JSON.stringify(callbackData);
      
      if (TransactionID) {
        payout.notes = (payout.notes || '') + `\nM-Pesa Ref: ${TransactionID}`;
      }
      
      await this.payoutRepository.save(payout);

      // Notify host of successful payout
      await this.notificationsService.create(
        payout.hostId,
        'Payout Successful',
        `Your payout of $${payout.netAmount} for booking ${payout.bookingId} has been processed.`,
        NotificationType.PAYMENT_RECEIVED,
      );
    } else {
      payout.status = PayoutStatus.FAILED;
      payout.adminNotes = ResultDesc;
      payout.gatewayResponse = JSON.stringify(callbackData);
      await this.payoutRepository.save(payout);
    }

    return { success: true };
  }

  // Handle M-Pesa B2C Queue Timeout
  async processB2cTimeoutCallback(callbackData: any) {
    // This is triggered if Safaricom fails to process the B2C request in time
    const originatorId = callbackData.OriginatorConversationID;

    if (originatorId) {
      const payout = await this.payoutRepository.findOne({ 
        where: { reference: originatorId } 
      });

      if (payout) {
        payout.status = PayoutStatus.FAILED;
        payout.adminNotes = (payout.adminNotes || '') + '\n[TIMEOUT] Request timed out in Safaricom queue.';
        payout.gatewayResponse = JSON.stringify(callbackData);
        await this.payoutRepository.save(payout);
        
        // Log error for monitoring
        console.error(`M-Pesa B2C Timeout for Payout ID: ${payout.id}`);
      }
    }
    return { success: true };
  }

  // Enqueue Stripe Webhook for async processing
  async handleStripeWebhook(signature: string, rawBody: Buffer) {
    await this.webhooksQueue.add(WebhookJobType.STRIPE, {
      type: WebhookJobType.STRIPE,
      signature,
      rawBody,
    });
    return { received: true, message: 'Stripe webhook enqueued for processing' };
  }

  // Enqueue M-Pesa STK Callback for async processing
  async handleMpesaCallback(callbackData: any) {
    await this.webhooksQueue.add(WebhookJobType.MPESA_STK_CALLBACK, {
      type: WebhookJobType.MPESA_STK_CALLBACK,
      payload: callbackData,
    });
    return { received: true, message: 'M-Pesa STK callback enqueued for processing' };
  }

  // Enqueue M-Pesa Balance Callback for async processing
  async handleBalanceCallback(callbackData: any) {
    await this.webhooksQueue.add(WebhookJobType.MPESA_BALANCE_CALLBACK, {
      type: WebhookJobType.MPESA_BALANCE_CALLBACK,
      payload: callbackData,
    });
    return { received: true, message: 'M-Pesa Balance callback enqueued for processing' };
  }

  // Enqueue M-Pesa B2C Callback for async processing
  async handleB2cPayoutCallback(callbackData: any) {
    await this.webhooksQueue.add(WebhookJobType.MPESA_B2C_CALLBACK, {
      type: WebhookJobType.MPESA_B2C_CALLBACK,
      payload: callbackData,
    });
    return { received: true, message: 'M-Pesa B2C callback enqueued for processing' };
  }

  // Enqueue M-Pesa B2C Timeout for async processing
  async handleB2cTimeoutCallback(callbackData: any) {
    await this.webhooksQueue.add(WebhookJobType.MPESA_B2C_TIMEOUT, {
      type: WebhookJobType.MPESA_B2C_TIMEOUT,
      payload: callbackData,
    });
    return { received: true, message: 'M-Pesa B2C timeout enqueued for processing' };
  }

  // Check M-Pesa Payment Status
  async checkMpesaPaymentStatus(transactionId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { reference: transactionId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return {
      transactionId: payment.reference,
      status: payment.status,
      amount: payment.amount,
    };
  }

  // Verify M-Pesa Payment
  async verifyMpesaPayment(paymentId: string) {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // In a real implementation, this would verify with M-Pesa API
    payment.status = TransactionStatus.COMPLETED;
    await this.paymentRepository.save(payment);

    await this.bookingRepository.update(payment.bookingId, {
      paymentStatus: 'paid',
      status: BookingStatus.CONFIRMED,
    });

    return { success: true, payment };
  }

  // ==================== PAYMENT HISTORY ====================

  // Get Payment History
  async getPaymentHistory(userId: string, filters: { status?: string; startDate?: string; endDate?: string } = {}) {
    const query = this.paymentRepository.createQueryBuilder('payment')
      .where('payment.userId = :userId', { userId });

    if (filters.status) {
      query.andWhere('payment.status = :status', { status: filters.status });
    }

    if (filters.startDate) {
      query.andWhere('payment.createdAt >= :startDate', { startDate: new Date(filters.startDate) });
    }

    if (filters.endDate) {
      query.andWhere('payment.createdAt <= :endDate', { endDate: new Date(filters.endDate) });
    }

    return query.orderBy('payment.createdAt', 'DESC').getMany();
  }

  // Get Payment Methods (stored payment methods)
  async getPaymentMethods(userId: string) {
    if (!this.stripe) {
      return [];
    }

    try {
      // Find user to get stripeCustomerId if stored
      const user = await this.userRepository.findOne({ where: { id: userId } });
      let customerId: string | undefined;
      
      // If user has a stripeCustomerId stored, use it
      if (user && (user as any).stripeCustomerId) {
        customerId = (user as any).stripeCustomerId;
      }
      
      // If no customer ID found, return empty
      if (!customerId) {
        return [];
      }

      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
      }));
    } catch (error) {
      return [];
    }
  }

  // Add Payment Method
  async addPaymentMethod(userId: string, paymentMethodId: string) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    try {
      // Find user to get stripeCustomerId if stored
      const user = await this.userRepository.findOne({ where: { id: userId } });
      let customerId: string;
      
      // If user has a stripeCustomerId stored, use it
      if (user && (user as any).stripeCustomerId) {
        customerId = (user as any).stripeCustomerId;
      } else {
        // Create a new customer
        const customer = await this.stripe.customers.create({ 
          metadata: { userId } 
        });
        customerId = customer.id;
        
        // Store the customer ID in the user (would need to update the user entity)
        // For now, we'll just use the created customer
      }

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });

      return { success: true, paymentMethodId };
    } catch (error) {
      throw new BadRequestException(`Failed to add payment method: ${error.message}`);
    }
  }

  // Delete Payment Method
  async deletePaymentMethod(paymentMethodId: string) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);
      return { success: true };
    } catch (error) {
      throw new BadRequestException(`Failed to delete payment method: ${error.message}`);
    }
  }

  // Set Default Payment Method
  async setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    try {
      // Find user to get stripeCustomerId
      const user = await this.userRepository.findOne({ where: { id: userId } });
      
      if (!user || !(user as any).stripeCustomerId) {
        throw new NotFoundException('Customer not found. Please add a payment method first.');
      }

      const customerId = (user as any).stripeCustomerId;

      await this.stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      return { success: true };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to set default payment method: ${error.message}`);
    }
  }

  // ==================== REFUNDS ====================

  // Create Refund
  async createRefund(bookingId: string, amount: number, reason: string, userId: string) {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const payment = await this.paymentRepository.findOne({
      where: { bookingId, type: TransactionType.PAYMENT, status: TransactionStatus.COMPLETED },
    });

    if (!payment) {
      throw new BadRequestException('No completed payment found for this booking');
    }

    const refund = this.refundRepository.create({
      bookingId,
      userId,
      amount,
      originalAmount: payment.amount,
      reason,
      status: RefundStatus.PENDING,
      paymentReference: payment.reference,
    });

    await this.refundRepository.save(refund);

    // Send notification to admin
    await this.notificationsService.create(
      'admin',
      'Refund Request',
      `New refund request for booking ${bookingId}. Amount: $${amount}`,
      NotificationType.SYSTEM_MESSAGE,
    );

    return refund;
  }

  // Get Refund Status
  async getRefundStatus(refundId: string) {
    const refund = await this.refundRepository.findOne({ where: { id: refundId } });
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }
    return refund;
  }

  // Get User Refunds
  async getRefunds(userId: string, filters: { status?: string } = {}) {
    const query = this.refundRepository.createQueryBuilder('refund')
      .where('refund.userId = :userId', { userId });

    if (filters.status) {
      query.andWhere('refund.status = :status', { status: filters.status });
    }

    return query.orderBy('refund.createdAt', 'DESC').getMany();
  }

  // Cancel Refund
  async cancelRefund(refundId: string) {
    const refund = await this.refundRepository.findOne({ where: { id: refundId } });
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Only pending refunds can be cancelled');
    }

    refund.status = RefundStatus.CANCELLED;
    await this.refundRepository.save(refund);

    return refund;
  }

  // Admin: Get All Refunds
  async getAllRefunds(filters: { status?: string; startDate?: string; endDate?: string } = {}) {
    const query = this.refundRepository.createQueryBuilder('refund');

    if (filters.status) {
      query.andWhere('refund.status = :status', { status: filters.status });
    }

    if (filters.startDate) {
      query.andWhere('refund.createdAt >= :startDate', { startDate: new Date(filters.startDate) });
    }

    if (filters.endDate) {
      query.andWhere('refund.createdAt <= :endDate', { endDate: new Date(filters.endDate) });
    }

    return query.orderBy('refund.createdAt', 'DESC').getMany();
  }

  // Admin: Get Refund by ID
  async getRefundById(refundId: string) {
    const refund = await this.refundRepository.findOne({ where: { id: refundId } });
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }
    return refund;
  }

  // Admin: Approve Refund
  async approveRefund(refundId: string, adminId: string) {
    const refund = await this.refundRepository.findOne({ where: { id: refundId } });
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Only pending refunds can be approved');
    }

    refund.status = RefundStatus.APPROVED;
    refund.processedBy = adminId;
    refund.adminNotes = 'Approved by admin';
    await this.refundRepository.save(refund);

    return refund;
  }

  // Admin: Reject Refund
  async rejectRefund(refundId: string, reason: string) {
    const refund = await this.refundRepository.findOne({ where: { id: refundId } });
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Only pending refunds can be rejected');
    }

    refund.status = RefundStatus.REJECTED;
    refund.adminNotes = reason;
    await this.refundRepository.save(refund);

    // Notify user
    await this.notificationsService.create(
      refund.userId,
      'Refund Rejected',
      `Your refund request has been rejected. Reason: ${reason}`,
      NotificationType.REFUND_PROCESSED,
    );

    return refund;
  }

  // Admin: Process Refund
  async processRefund(refundId: string, adminId: string) {
    const refund = await this.refundRepository.findOne({ where: { id: refundId } });
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== RefundStatus.APPROVED) {
      throw new BadRequestException('Only approved refunds can be processed');
    }

    // Process the refund via Stripe
    if (this.stripe && refund.paymentReference) {
      try {
        await this.stripe.refunds.create({
          payment_intent: refund.paymentReference,
          amount: Math.round(refund.amount * 100),
        });
      } catch (error) {
        throw new BadRequestException(`Failed to process refund: ${error.message}`);
      }
    }

    refund.status = RefundStatus.PROCESSED;
    refund.processedBy = adminId;
    refund.processedAt = new Date();
    await this.refundRepository.save(refund);

    // Create refund payment record
    const refundPayment = this.paymentRepository.create({
      bookingId: refund.bookingId,
      userId: refund.userId,
      type: TransactionType.REFUND,
      amount: refund.amount,
      status: TransactionStatus.COMPLETED,
      reference: `REFUND-${refund.id}`,
      notes: `Refund for booking ${refund.bookingId}`,
    });

    await this.paymentRepository.save(refundPayment);

    // Notify user
    await this.notificationsService.create(
      refund.userId,
      'Refund Processed',
      `Your refund of $${refund.amount} has been processed.`,
      NotificationType.REFUND_PROCESSED,
    );

    return refund;
  }

  // Admin: Get Refund Stats
  async getRefundStats() {
    const total = await this.refundRepository.count();
    const pending = await this.refundRepository.count({ where: { status: RefundStatus.PENDING } });
    const approved = await this.refundRepository.count({ where: { status: RefundStatus.APPROVED } });
    const processed = await this.refundRepository.count({ where: { status: RefundStatus.PROCESSED } });
    const rejected = await this.refundRepository.count({ where: { status: RefundStatus.REJECTED } });

    const result = await this.refundRepository
      .createQueryBuilder('refund')
      .select('SUM(refund.amount)', 'total')
      .where('refund.status = :status', { status: RefundStatus.PROCESSED })
      .getRawOne();

    return {
      total,
      pending,
      approved,
      processed,
      rejected,
      totalAmount: parseFloat(result?.total || 0),
    };
  }

  // ==================== ESCROW ====================

  // Hold Escrow (when booking is cancelled)
  async holdEscrow(bookingId: string) {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Update booking payment status
    booking.paymentStatus = 'escrow_held';
    await this.bookingRepository.save(booking);

    // Create escrow payment record
    const payment = this.paymentRepository.create({
      bookingId,
      userId: booking.userId,
      type: TransactionType.PAYMENT,
      amount: booking.totalPrice,
      status: TransactionStatus.PENDING,
      reference: `ESCROW-${bookingId}`,
      notes: 'Funds held in escrow',
    });

    await this.paymentRepository.save(payment);

    return { success: true, message: 'Funds held in escrow' };
  }

  // Release Escrow (refund to guest or payout to host)
  async releaseEscrow(bookingId: string, releaseTo: 'guest' | 'host') {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (releaseTo === 'host') {
      // This would trigger a payout to the host
      await this.processHostPayout(bookingId);
      booking.paymentStatus = 'paid';
    } else {
      // This would refund the guest
      booking.paymentStatus = 'refunded'; // logic for B2C refund could be added here
    }

    await this.bookingRepository.save(booking);

    return { success: true, message: `Escrow released to ${releaseTo}` };
  }

  // Get Escrow Status
  async getEscrowStatus(bookingId: string) {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return {
      bookingId,
      status: booking.paymentStatus,
      amount: booking.totalPrice,
    };
  }

  // ==================== ADMIN PAYMENTS ====================

  // Admin: Get All Payments
  async getAllPayments(filters: { status?: string; startDate?: string; endDate?: string } = {}) {
    const query = this.paymentRepository.createQueryBuilder('payment');

    if (filters.status) {
      query.andWhere('payment.status = :status', { status: filters.status });
    }

    if (filters.startDate) {
      query.andWhere('payment.createdAt >= :startDate', { startDate: new Date(filters.startDate) });
    }

    if (filters.endDate) {
      query.andWhere('payment.createdAt <= :endDate', { endDate: new Date(filters.endDate) });
    }

    return query.orderBy('payment.createdAt', 'DESC').getMany();
  }

  // Admin: Get Payment by ID
  async getPaymentById(paymentId: string) {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  // Admin: Verify Payment
  async adminVerifyPayment(paymentId: string) {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Mark as verified
    payment.notes = (payment.notes || '') + '\nVerified by admin';
    await this.paymentRepository.save(payment);

    return { success: true, payment };
  }

  // Admin: Cancel Payment
  async adminCancelPayment(paymentId: string, reason: string) {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    payment.status = TransactionStatus.CANCELLED;
    payment.notes = reason;
    await this.paymentRepository.save(payment);

    // Update booking
    await this.bookingRepository.update(payment.bookingId, {
      paymentStatus: 'cancelled',
    });

    return { success: true, payment };
  }

  // Admin: Get Payment Stats
  async getPaymentStats() {
    const total = await this.paymentRepository.count();
    const completed = await this.paymentRepository.count({ where: { status: TransactionStatus.COMPLETED } });
    const pending = await this.paymentRepository.count({ where: { status: TransactionStatus.PENDING } });
    const failed = await this.paymentRepository.count({ where: { status: TransactionStatus.FAILED } });
    const cancelled = await this.paymentRepository.count({ where: { status: TransactionStatus.CANCELLED } });

    const result = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    return {
      total,
      completed,
      pending,
      failed,
      cancelled,
      totalAmount: parseFloat(result?.total || 0),
    };
  }

  // Master Hub: Get Exact Financial Stats (Commission vs Subscriptions)
  async getMasterFinancialStats(filters: { startDate?: string; endDate?: string } = {}) {
    const now = new Date();
    const startDate = filters.startDate ? new Date(filters.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = filters.endDate ? new Date(filters.endDate) : now;

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Helper for calculating revenue in a period
    const calculateRevenue = async (start: Date, end: Date) => {
      const comm = await this.payoutRepository.createQueryBuilder('payout')
        .select('SUM(payout.commission)', 'total')
        .where('payout.status = :status', { status: PayoutStatus.COMPLETED })
        .andWhere('payout.processedAt BETWEEN :start AND :end', { start, end })
        .getRawOne();
      const subs = await this.paymentRepository.createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'total')
        .where('payment.type = :type', { type: TransactionType.SUBSCRIPTION })
        .andWhere('payment.status = :status', { status: TransactionStatus.COMPLETED })
        .andWhere('payment.updatedAt BETWEEN :start AND :end', { start, end })
        .getRawOne();
      return parseFloat(comm?.total || 0) + parseFloat(subs?.total || 0);
    };

    // Helper for calculating host signups in a period
    const calculateHostSignupsCount = async (start: Date, end: Date) => {
      const result = await this.userRepository
        .createQueryBuilder('user')
        .select('COUNT(user.id)', 'count')
        .where('user.role = :role', { role: UserRole.HOST })
        .andWhere('user.createdAt BETWEEN :start AND :end', { start, end })
        .getRawOne();
      return parseInt(result?.count || 0);
    };

    // Calculate Growth
    const currentRevenue = await calculateRevenue(currentMonthStart, now);
    const prevRevenue = await calculateRevenue(prevMonthStart, prevMonthEnd);
    const momGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Calculate Host Growth
    const currentHosts = await calculateHostSignupsCount(currentMonthStart, now);
    const prevHosts = await calculateHostSignupsCount(prevMonthStart, prevMonthEnd);
    const hostGrowth = prevHosts > 0 ? ((currentHosts - prevHosts) / prevHosts) * 100 : 0;

    // Monthly GBV Trends (Last 6 Months)
    const gbvTrend = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const vol = await this.paymentRepository.createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'total')
        .where('payment.type = :type', { type: TransactionType.PAYMENT })
        .andWhere('payment.status = :status', { status: TransactionStatus.COMPLETED })
        .andWhere('payment.updatedAt BETWEEN :mStart AND :mEnd', { mStart, mEnd })
        .getRawOne();
      
      gbvTrend.push({
        month: mStart.toLocaleString('default', { month: 'short' }),
        value: parseFloat(vol?.total || 0)
      });
    }

    // Grand Totals
    const commissionResult = await this.payoutRepository
      .createQueryBuilder('payout')
      .select('SUM(payout.commission)', 'total')
      .where('payout.status = :status', { status: PayoutStatus.COMPLETED })
      .andWhere('payout.processedAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .getRawOne();

    const subscriptionResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.type = :type', { type: TransactionType.SUBSCRIPTION })
      .andWhere('payment.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('payment.updatedAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .getRawOne();

    const grossVolume = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('payment.type = :type', { type: TransactionType.PAYMENT })
      .andWhere('payment.updatedAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .getRawOne();

    const avgBookingResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('AVG(payment.amount)', 'average')
      .where('payment.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('payment.type = :type', { type: TransactionType.PAYMENT })
      .andWhere('payment.updatedAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .getRawOne();

    const hostSignupResult = await this.userRepository
      .createQueryBuilder('user')
      .select('COUNT(user.id)', 'count')
      .where('user.role = :role', { role: UserRole.HOST })
      .andWhere('user.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .getRawOne();

    const commissionRevenue = parseFloat(commissionResult?.total || 0);
    const subscriptionRevenue = parseFloat(subscriptionResult?.total || 0);
    const totalVolume = parseFloat(grossVolume?.total || 0);
    const averageBookingValue = parseFloat(avgBookingResult?.average || 0);
    const newHostSignups = parseInt(hostSignupResult?.count || 0);

    return {
      revenueBreakdown: {
        commissionRevenue,
        subscriptionRevenue,
        totalPlatformEarnings: commissionRevenue + subscriptionRevenue,
        momGrowth,
        hostGrowth,
      },
      marketMetrics: {
        grossBookingVolume: totalVolume,
        platformTakeRate: totalVolume > 0 ? (commissionRevenue / totalVolume) * 100 : 0,
        gbvTrend,
        averageBookingValue,
        newHostSignups,
      },
      lastUpdated: new Date(),
    };
  }

  // ==================== PAYMENT RECEIPTS ====================

  // Get Payment Receipt
  async getPaymentReceipt(paymentId: string) {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const booking = await this.bookingRepository.findOne({ where: { id: payment.bookingId } });
    const property = booking ? await this.propertyRepository.findOne({ where: { id: booking.propertyId } }) : null;

    return {
      payment,
      booking,
      property,
      generatedAt: new Date(),
    };
  }

  // Generate Receipt
  async generateReceipt(paymentId: string) {
    const receipt = await this.getPaymentReceipt(paymentId);
    return {
      ...receipt,
      receiptNumber: `RCP-${paymentId.substring(0, 8).toUpperCase()}`,
    };
  }

  // Email Receipt
  async emailReceipt(paymentId: string, email: string) {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // In a real implementation, this would send an email
    return { success: true, message: `Receipt sent to ${email}` };
  }
}
