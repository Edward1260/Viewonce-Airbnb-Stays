import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ==================== USER PAYMENTS ====================

  // Create Payment Intent (Stripe)
  @Post('create-intent')
  async createPaymentIntent(
    @Body() body: { bookingId: string; amount: number },
    @Request() req,
  ) {
    return this.paymentsService.createPaymentIntent(body.bookingId, body.amount);
  }

  // Process Payment
  @Post('process')
  async processPayment(@Body() body: { paymentIntentId: string }) {
    return this.paymentsService.processPayment(body.paymentIntentId);
  }

  // Process Card Payment
  @Post('card')
  async processCardPayment(
    @Body() body: { bookingId: string; paymentMethodId: string; amount: number },
    @Request() req,
  ) {
    return this.paymentsService.processCardPayment(
      body.bookingId,
      body.paymentMethodId,
      body.amount,
    );
  }

  // Verify Card Payment
  @Get('card/verify/:paymentId')
  async verifyCardPayment(@Param('paymentId') paymentId: string) {
    return this.paymentsService.verifyCardPayment(paymentId);
  }

  // ==================== PAYPAL ====================

  // Create PayPal Payment
  @Post('paypal')
  async createPayPalPayment(
    @Body() body: { bookingId: string; amount: number },
    @Request() req,
  ) {
    return this.paymentsService.createPayPalPayment(body.bookingId, body.amount);
  }

  // Capture PayPal Payment
  @Post('paypal/capture')
  async capturePayPalPayment(@Body() body: { paymentId: string }) {
    return this.paymentsService.capturePayPalPayment(body.paymentId);
  }

  // ==================== BANK TRANSFER ====================

  // Create Bank Transfer Payment
  @Post('bank-transfer')
  async createBankTransferPayment(
    @Body() body: { bookingId: string; amount: number },
    @Request() req,
  ) {
    return this.paymentsService.createBankTransferPayment(body.bookingId, body.amount);
  }

  // Verify Bank Transfer (Admin or callback)
  @Post('bank-transfer/verify')
  async verifyBankTransfer(
    @Body() body: { paymentId: string; reference: string },
  ) {
    return this.paymentsService.verifyBankTransfer(body.paymentId, body.reference);
  }

  // Get Bank Transfer Instructions
  @Get('bank-transfer/instructions/:bookingId')
  async getBankTransferInstructions(@Param('bookingId') bookingId: string) {
    return this.paymentsService.getBankTransferInstructions(bookingId);
  }

  // ==================== M-PESA ====================

  // Initiate M-Pesa Payment
  @Post('mpesa')
  async initiateMpesaPayment(
    @Body() body: { bookingId: string; phoneNumber: string; amount: number },
    @Request() req,
  ) {
    return this.paymentsService.initiateMpesaPayment(
      body.bookingId,
      body.phoneNumber,
      body.amount,
    );
  }

  // Check M-Pesa Payment Status
  @Get('mpesa/status/:transactionId')
  async checkMpesaPaymentStatus(@Param('transactionId') transactionId: string) {
    return this.paymentsService.checkMpesaPaymentStatus(transactionId);
  }

  // Verify M-Pesa Payment
  @Post('mpesa/verify')
  async verifyMpesaPayment(@Body() body: { paymentId: string }) {
    return this.paymentsService.verifyMpesaPayment(body.paymentId);
  }

  // ==================== PAYMENT HISTORY & METHODS ====================

  // Get Payment History
  @Get('history')
  async getPaymentHistory(
    @Query() query: { status?: string; startDate?: string; endDate?: string },
    @Request() req,
  ) {
    return this.paymentsService.getPaymentHistory(req.user.id, query);
  }

  // Get Payment Methods
  @Get('methods')
  async getPaymentMethods(@Request() req) {
    return this.paymentsService.getPaymentMethods(req.user.id);
  }

  // Add Payment Method
  @Post('methods')
  async addPaymentMethod(
    @Body() body: { paymentMethodId: string },
    @Request() req,
  ) {
    return this.paymentsService.addPaymentMethod(req.user.id, body.paymentMethodId);
  }

  // Delete Payment Method
  @Delete('methods/:paymentMethodId')
  async deletePaymentMethod(@Param('paymentMethodId') paymentMethodId: string) {
    return this.paymentsService.deletePaymentMethod(paymentMethodId);
  }

  // Set Default Payment Method
  @Put('methods/default')
  async setDefaultPaymentMethod(
    @Body() body: { paymentMethodId: string },
    @Request() req,
  ) {
    return this.paymentsService.setDefaultPaymentMethod(req.user.id, body.paymentMethodId);
  }

  // ==================== REFUNDS ====================

  // Create Refund Request
  @Post('refund')
  async createRefund(
    @Body() body: { bookingId: string; amount: number; reason: string },
    @Request() req,
  ) {
    return this.paymentsService.createRefund(
      body.bookingId,
      body.amount,
      body.reason,
      req.user.id,
    );
  }

  // Get Refund Status
  @Get('refund/:refundId')
  async getRefundStatus(@Param('refundId') refundId: string) {
    return this.paymentsService.getRefundStatus(refundId);
  }

  // Get User Refunds
  @Get('refunds')
  async getRefunds(
    @Query() query: { status?: string },
    @Request() req,
  ) {
    return this.paymentsService.getRefunds(req.user.id, query);
  }

  // Cancel Refund Request
  @Delete('refund/:refundId')
  async cancelRefund(@Param('refundId') refundId: string) {
    return this.paymentsService.cancelRefund(refundId);
  }

  // ==================== ESCROW ====================

  // Get Escrow Status
  @Get('escrow/:bookingId')
  async getEscrowStatus(@Param('bookingId') bookingId: string) {
    return this.paymentsService.getEscrowStatus(bookingId);
  }

  // Hold Escrow (typically called by system when booking is cancelled)
  @Post('escrow/hold/:bookingId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async holdEscrow(@Param('bookingId') bookingId: string) {
    return this.paymentsService.holdEscrow(bookingId);
  }

  // Release Escrow
  @Post('escrow/release/:bookingId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async releaseEscrow(
    @Param('bookingId') bookingId: string,
    @Body() body: { releaseTo: 'guest' | 'host' },
  ) {
    return this.paymentsService.releaseEscrow(bookingId, body.releaseTo);
  }

  // ==================== RECEIPTS ====================

  // Get Payment Receipt
  @Get('receipt/:paymentId')
  async getPaymentReceipt(@Param('paymentId') paymentId: string) {
    return this.paymentsService.getPaymentReceipt(paymentId);
  }

  // Generate Receipt
  @Get('receipt/:paymentId/generate')
  async generateReceipt(@Param('paymentId') paymentId: string) {
    return this.paymentsService.generateReceipt(paymentId);
  }

  // Email Receipt
  @Post('receipt/:paymentId/email')
  async emailReceipt(
    @Param('paymentId') paymentId: string,
    @Body() body: { email: string },
  ) {
    return this.paymentsService.emailReceipt(paymentId, body.email);
  }
}

// Admin Payments Controller
@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Get All Payments
  @Get()
  async getAllPayments(
    @Query() query: { status?: string; startDate?: string; endDate?: string },
  ) {
    return this.paymentsService.getAllPayments(query);
  }

  // Get Payment by ID
  @Get(':paymentId')
  async getPaymentById(@Param('paymentId') paymentId: string) {
    return this.paymentsService.getPaymentById(paymentId);
  }

  // Verify Payment
  @Put(':paymentId/verify')
  async adminVerifyPayment(@Param('paymentId') paymentId: string) {
    return this.paymentsService.adminVerifyPayment(paymentId);
  }

  // Cancel Payment
  @Put(':paymentId/cancel')
  async adminCancelPayment(
    @Param('paymentId') paymentId: string,
    @Body() body: { reason: string },
  ) {
    return this.paymentsService.adminCancelPayment(paymentId, body.reason);
  }

  // Get Payment Stats
  @Get('stats/overview')
  async getPaymentStats() {
    return this.paymentsService.getPaymentStats();
  }
}

// Admin Refunds Controller
@Controller('admin/refunds')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminRefundsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Get All Refunds
  @Get()
  async getAllRefunds(
    @Query() query: { status?: string; startDate?: string; endDate?: string },
  ) {
    return this.paymentsService.getAllRefunds(query);
  }

  // Get Refund by ID
  @Get(':refundId')
  async getRefundById(@Param('refundId') refundId: string) {
    return this.paymentsService.getRefundById(refundId);
  }

  // Approve Refund
  @Put(':refundId/approve')
  async approveRefund(
    @Param('refundId') refundId: string,
    @Request() req,
  ) {
    return this.paymentsService.approveRefund(refundId, req.user.id);
  }

  // Reject Refund
  @Put(':refundId/reject')
  async rejectRefund(
    @Param('refundId') refundId: string,
    @Body() body: { reason: string },
  ) {
    return this.paymentsService.rejectRefund(refundId, body.reason);
  }

  // Process Refund
  @Put(':refundId/process')
  async processRefund(
    @Param('refundId') refundId: string,
    @Request() req,
  ) {
    return this.paymentsService.processRefund(refundId, req.user.id);
  }

  // Get Refund Stats
  @Get('stats/overview')
  async getRefundStats() {
    return this.paymentsService.getRefundStats();
  }
}
