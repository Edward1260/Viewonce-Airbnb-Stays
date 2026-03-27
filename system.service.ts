import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Triggers the auto-correction routine for system health.
   * Scans the database for missing critical indexes and applies them to improve performance.
   */
  async runAutoCorrection() {
    this.logger.log('Initiating Error Auto-Correction: Database Indexing sequence');
    
    const indexingResults = await this.applyMissingIndexes();
    
    return {
      task: 'Database Indexing',
      status: 'Complete',
      indexesCreated: indexingResults,
      timestamp: new Date().toISOString()
    };
  }

  private async applyMissingIndexes() {
    // Create a QueryRunner to execute raw SQL for index checks and creation
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    
    const created = [];
    // List of critical fields that require indexing based on common query patterns
    const criticalIndexes = [
      { table: 'user', column: 'email', name: 'idx_user_email' },
      { table: 'user', column: 'role', name: 'idx_user_role' },
      { table: 'property', column: 'hostId', name: 'idx_property_host' },
      { table: 'property', column: 'status', name: 'idx_property_status' },
      { table: 'booking', column: 'propertyId', name: 'idx_booking_property' },
      { table: 'booking', column: 'guestId', name: 'idx_booking_guest' },
      { table: 'booking', column: 'status', name: 'idx_booking_status' },
      { table: 'payment', column: 'bookingId', name: 'idx_payment_booking' }
    ];

    for (const idx of criticalIndexes) {
      try {
        // PostgreSQL specific check to see if the index already exists
        const check = await queryRunner.query(
          `SELECT 1 FROM pg_indexes WHERE indexname = $1`, [idx.name]
        );

        if (check.length === 0) {
          await queryRunner.query(`CREATE INDEX IF NOT EXISTS "${idx.name}" ON "${idx.table}" ("${idx.column}")`);
          created.push(idx.name);
          this.logger.log(`Auto-Correction: Applied missing index ${idx.name} on ${idx.table}`);
        }
      } catch (err) {
        this.logger.error(`Auto-Correction: Failed to apply index ${idx.name} - ${err.message}`);
      }
    }

    await queryRunner.release();
    return created;
  }
}