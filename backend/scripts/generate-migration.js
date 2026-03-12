/**
 * Migration Helper Script
 * 
 * This script helps generate and run TypeORM migrations.
 * 
 * Usage:
 * 1. Generate migration from entities:
 *    npm run migration:generate -- src/migrations/MigrationName
 * 
 * 2. Run migrations:
 *    npm run migration:run
 * 
 * 3. Revert last migration:
 *    npm run migration:revert
 * 
 * 4. Show migration status:
 *    npm run migration:show
 * 
 * For PostgreSQL, make sure to set:
 * DB_TYPE=postgres
 * 
 * in your .env file before running migrations.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../src/migrations');

// Ensure migrations directory exists
if (!fs.existsSync(MIGRATIONS_DIR)) {
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

console.log('Migration Helper Script');
console.log('========================');
console.log('');
console.log('Available commands:');
console.log('  npm run migration:generate -- <MigrationName>');
console.log('  npm run migration:run');
console.log('  npm run migration:revert');
console.log('  npm run migration:show');
console.log('');
console.log('Make sure to set DB_TYPE=postgres in .env for PostgreSQL migrations');
console.log('');

// Check if .env exists
const envPath = path.join(__dirname, '../.env');
const envExamplePath = path.join(__dirname, '../.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('Note: .env file not found. Copy .env.example to .env and configure it.');
}

// Check current database type
const nodeEnv = process.env.NODE_ENV || 'development';
const dbType = process.env.DB_TYPE || 'sqlite';

console.log(`Current configuration:`);
console.log(`  NODE_ENV: ${nodeEnv}`);
console.log(`  DB_TYPE: ${dbType}`);
console.log('');
console.log('For production, use PostgreSQL:');
console.log('  DB_TYPE=postgres npm run migration:run');
