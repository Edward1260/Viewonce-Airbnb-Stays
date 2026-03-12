import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostgreSQLSchemaMigration1740000000000 implements MigrationInterface {
  name = 'PostgreSQLSchemaMigration1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid-ossp extension for UUID generation
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Note: Tables and indexes will be created automatically by TypeORM
    // when synchronize is enabled or when running migrations.
    // This migration serves as a marker for PostgreSQL schema setup.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No tables to drop - they will be managed by TypeORM synchronize
  }
}
