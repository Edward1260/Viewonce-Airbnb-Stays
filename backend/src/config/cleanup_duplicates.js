const fs = require('fs');
const path = require('path');

/**
 * This script cleans up duplicate files identified in COMPREHENSIVE_ANALYSIS.md
 * It ensures that the project moves toward a "Single Source of Truth".
 */

const projectRoot = path.join(__dirname, '..');

const filesToDelete = [
    // Backend Main Duplicates
    'backend/src/main-final.ts',
    'backend/src/main-fixed.ts',
    'backend/src/main-minimal.ts',
    'backend/src/main-no-db.ts',
    'backend/src/main-simple.ts',
    'backend/src/main-simple-final.ts',
    'backend/src/main-working.ts',
    'backend/src/main.final.ts',
    
    // Backend Module Duplicates
    'backend/src/app.module.final.ts',
    'backend/src/app.module.no-db.ts',
    'backend/src/app.module.simple.ts',
    
    // Frontend Duplicates
    'admin-payments.html',
    'platform-master-hub-upgraded.html',
    'auth.html', // Note: auth-updated.html is recommended to be renamed to auth.html later
    'script.js',
    'config.js',
    'temp-js-check.js',
    'temp-js-check-clean.js'
];

const renames = [
    { from: 'backend/src/main-working-final.ts', to: 'backend/src/main.ts' },
    { from: 'backend/src/app.module.fixed.ts', to: 'backend/src/app.module.ts' },
    { from: 'auth-updated.html', to: 'auth.html' },
    { from: 'script-fixed.js', to: 'script.js' },
    { from: 'config-fixed.js', to: 'config.js' }
];

async function cleanup() {
    console.log('--- Starting Codebase Consolidation ---');

    // 1. Perform Deletions
    filesToDelete.forEach(file => {
        const fullPath = path.join(projectRoot, file);
        if (fs.existsSync(fullPath)) {
            try {
                fs.unlinkSync(fullPath);
                console.log(`[DELETED] ${file}`);
            } catch (err) {
                console.error(`[ERROR] Could not delete ${file}: ${err.message}`);
            }
        }
    });

    // 2. Perform Renames (Promotion to Source of Truth)
    renames.forEach(item => {
        const oldPath = path.join(projectRoot, item.from);
        const newPath = path.join(projectRoot, item.to);

        if (fs.existsSync(oldPath)) {
            try {
                // If target exists, delete it first to allow overwrite
                if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
                
                fs.renameSync(oldPath, newPath);
                console.log(`[PROMOTED] ${item.from} -> ${item.to}`);
            } catch (err) {
                console.error(`[ERROR] Could not rename ${item.from}: ${err.message}`);
            }
        }
    });

    console.log('--- Consolidation Complete ---');
    console.log('Next Step: Run "npm run start:dev" in the backend to verify the promoted main.ts works correctly.');
}

cleanup();