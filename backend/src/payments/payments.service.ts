import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Payment, TransactionType, TransactionStatus } from '../entities/payment.entity';
import { Refund, RefundStatus } from '../entities/refund.entity';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { User, UserRole } from '../entities/user.entity';
import { Property } from '../entities/property.entity';
import { NotificationType } from '../entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
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
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    private configService: ConfigService,
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

  // Initiate M-Pesa Payment
  async initiateMpesaPayment(bookingId: string, phoneNumber: string, amount: number) {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Generate transaction ID
    const transactionId = `MPESA-${Date.now()}`;

    const payment = this.paymentRepository.create({
      bookingId,
      userId: booking.userId,
      type: TransactionType.PAYMENT,
      amount,
      status: TransactionStatus.PENDING,
      reference: transactionId,
      notes: `M-Pesa payment initiated. Phone: ${phoneNumber}`,
    });

    await this.paymentRepository.save(payment);

    // In a real implementation, this would call M-Pesa STK Push API
    return {
      transactionId,
      status: 'pending',
      message: 'STK push sent to your phone',
    };
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
      booking.paymentStatus = 'paid';
    } else {
      // This would refund the guest
      booking.paymentStatus = 'refunded';
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
