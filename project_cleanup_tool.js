const fs = require('fs');
const path = require('path');

/**
 * ViewOnce Project Cleanup Tool
 * Automates the removal of duplicated files and malformed directories.
 */

const ROOT = 'c:/Users/Administrator/Downloads/Viewonce Airbnb Stays';

const DELETIONS = [
    // Frontend Duplicates
    'admin-payments.html',
    'platform-master-hub-upgraded.html',
    'auth.html',
    'script.js',
    'config.js',
    'temp-js-check.js',
    'temp-js-check-clean.js',
    
    // Backend Duplicates (Keep main-working-final.ts and app.module.fixed.ts)
    'backend/src/main.ts',
    'backend/src/main-final.ts',
    'backend/src/main-fixed.ts',
    'backend/src/main-minimal.ts',
    'backend/src/main-no-db.ts',
    'backend/src/main-simple.ts',
    'backend/src/main-simple-final.ts',
    'backend/src/main-working.ts',
    'backend/src/main.final.ts',
    'backend/src/app.module.ts',
    'backend/src/app.module.final.ts',
    'backend/src/app.module.no-db.ts',
    'backend/src/app.module.simple.ts',
    'backend/src/seeder.ts',
];

const RENAMES = [
    { from: 'admin-payments-fixed.html', to: 'admin-payments.html' },
    { from: 'auth-updated.html', to: 'auth.html' },
    { from: 'script-fixed.js', to: 'script.js' },
    { from: 'config-fixed.js', to: 'config.js' },
    { from: 'backend/src/main-working-final.ts', to: 'backend/src/main.ts' },
    { from: 'backend/src/app.module.fixed.ts', to: 'backend/src/app.module.ts' },
    { from: 'backend/src/seeder-fixed.ts', to: 'backend/src/seeder.ts' },
];

const MALFORMED_DIRS = [
    'backend/src/entities./',
    'backend/src to use a tool. Let me add graceful shutdown handling to main.ts./'
];

function cleanup() {
    console.log('Starting project cleanup...');

    // 1. Delete Files
    DELETIONS.forEach(file => {
        const fullPath = path.join(ROOT, file);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`Deleted: ${file}`);
        }
    });

    // 2. Remove Malformed Directories
    MALFORMED_DIRS.forEach(dir => {
        const fullPath = path.join(ROOT, dir);
        if (fs.existsSync(fullPath)) {
            fs.rmSync(fullPath, { recursive: true, force: true });
            console.log(`Removed malformed directory: ${dir}`);
        }
    });

    // 3. Rename Correct Versions to Standard Filenames
    RENAMES.forEach(pair => {
        const fromPath = path.join(ROOT, pair.from);
        const toPath = path.join(ROOT, pair.to);
        if (fs.existsSync(fromPath)) {
            fs.renameSync(fromPath, toPath);
            console.log(`Consolidated: ${pair.from} -> ${pair.to}`);
        }
    });

    console.log('Cleanup complete. Please verify your backend build.');
}

cleanup();