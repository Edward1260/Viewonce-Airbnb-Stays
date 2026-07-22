import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * Migration: Add Composite Indexes
 * 
 * This migration adds composite indexes to improve query performance
 * for common query patterns in the application.
 * 
 * Indexes added:
 * - Properties: status + type, location + price range, hostId + status
 * - Bookings: propertyId + status, userId + status, checkIn + checkOut
 * - Payments: bookingId + status, userId + createdAt
 * - Reviews: propertyId + rating
 * - Messages: senderId + createdAt, receiverId + createdAt
 */
export class AddCompositeIndexes1700000000000 implements MigrationInterface {
  name = 'AddCompositeIndexes1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Property composite indexes
    await queryRunner.createIndex(
      'properties',
      new TableIndex({
        name: 'IDX_properties_status_type',
        columnNames: ['status', 'type'],
      })
    );

    await queryRunner.createIndex(
      'properties',
      new TableIndex({
        name: 'IDX_properties_location_price',
        columnNames: ['location', 'price'],
      })
    );

    await queryRunner.createIndex(
      'properties',
      new TableIndex({
        name: 'IDX_properties_host_status',
        columnNames: ['hostId', 'status'],
      })
    );

    await queryRunner.createIndex(
      'properties',
      new TableIndex({
        name: 'IDX_properties_rating_created',
        columnNames: ['rating', 'createdAt'],
      })
    );

    // Booking composite indexes
    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'IDX_bookings_property_status',
        columnNames: ['propertyId', 'status'],
      })
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'IDX_bookings_user_status',
        columnNames: ['userId', 'status'],
      })
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'IDX_bookings_dates_status',
        columnNames: ['checkIn', 'checkOut', 'status'],
      })
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'IDX_bookings_paymentStatus_refundStatus',
        columnNames: ['paymentStatus', 'refundStatus'],
      })
    );

    // Payment composite indexes
    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_booking_status',
        columnNames: ['bookingId', 'status'],
      })
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_user_createdAt',
        columnNames: ['userId', 'createdAt'],
      })
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_status_createdAt',
        columnNames: ['status', 'createdAt'],
      })
    );

    // Review composite indexes
    await queryRunner.createIndex(
      'reviews',
      new TableIndex({
        name: 'IDX_reviews_property_rating',
        columnNames: ['propertyId', 'rating'],
      })
    );

    await queryRunner.createIndex(
      'reviews',
      new TableIndex({
        name: 'IDX_reviews_user_property',
        columnNames: ['userId', 'propertyId'],
      })
    );

    // Message composite indexes
    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'IDX_messages_sender_createdAt',
        columnNames: ['senderId', 'createdAt'],
      })
    );

    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'IDX_messages_receiver_createdAt',
        columnNames: ['receiverId', 'createdAt'],
      })
    );

    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'IDX_messages_conversation',
        columnNames: ['senderId', 'receiverId', 'createdAt'],
      })
    );

    // Notification composite indexes
    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_user_read',
        columnNames: ['userId', 'isRead', 'createdAt'],
      })
    );

    // Wishlist composite indexes
    await queryRunner.createIndex(
      'wishlists',
      new TableIndex({
        name: 'IDX_wishlists_user_property',
        columnNames: ['userId', 'propertyId'],
      })
    );

    // Payout composite indexes
    await queryRunner.createIndex(
      'payouts',
      new TableIndex({
        name: 'IDX_payouts_host_status',
        columnNames: ['hostId', 'status'],
      })
    );

    await queryRunner.createIndex(
      'payouts',
      new TableIndex({
        name: 'IDX_payouts_status_createdAt',
        columnNames: ['status', 'createdAt'],
      })
    );

    // Audit log composite indexes
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_user_action',
        columnNames: ['userId', 'action'],
      })
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_createdAt_action',
        columnNames: ['createdAt', 'action'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop property indexes
    await queryRunner.dropIndex('properties', 'IDX_properties_status_type');
    await queryRunner.dropIndex('properties', 'IDX_properties_location_price');
    await queryRunner.dropIndex('properties', 'IDX_properties_host_status');
    await queryRunner.dropIndex('properties', 'IDX_properties_rating_created');

    // Drop booking indexes
    await queryRunner.dropIndex('bookings', 'IDX_bookings_property_status');
    await queryRunner.dropIndex('bookings', 'IDX_bookings_user_status');
    await queryRunner.dropIndex('bookings', 'IDX_bookings_dates_status');
    await queryRunner.dropIndex('bookings', 'IDX_bookings_paymentStatus_refundStatus');

    // Drop payment indexes
    await queryRunner.dropIndex('payments', 'IDX_payments_booking_status');
    await queryRunner.dropIndex('payments', 'IDX_payments_user_createdAt');
    await queryRunner.dropIndex('payments', 'IDX_payments_status_createdAt');

    // Drop review indexes
    await queryRunner.dropIndex('reviews', 'IDX_reviews_property_rating');
    await queryRunner.dropIndex('reviews', 'IDX_reviews_user_property');

    // Drop message indexes
    await queryRunner.dropIndex('messages', 'IDX_messages_sender_createdAt');
    await queryRunner.dropIndex('messages', 'IDX_messages_receiver_createdAt');
    await queryRunner.dropIndex('messages', 'IDX_messages_conversation');

    // Drop notification indexes
    await queryRunner.dropIndex('notifications', 'IDX_notifications_user_read');

    // Drop wishlist indexes
    await queryRunner.dropIndex('wishlists', 'IDX_wishlists_user_property');

    // Drop payout indexes
    await queryRunner.dropIndex('payouts', 'IDX_payouts_host_status');
    await queryRunner.dropIndex('payouts', 'IDX_payouts_status_createdAt');

    // Drop audit log indexes
    await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_user_action');
    await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_createdAt_action');
  }
}
