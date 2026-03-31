const fs = require('fs');
const path = require('path');

/**
 * PWA Asset Validator
 * Checks if all assets defined in manifest.json exist on disk.
 */
function verifyPwaAssets() {
    const manifestPath = path.join(__dirname, 'manifest.json');
    const baseDir = __dirname;

    if (!fs.existsSync(manifestPath)) {
        console.error('\x1b[31m%s\x1b[0m', '✖ Error: manifest.json not found in the root directory.');
        return;
    }

    console.log('\x1b[34m%s\x1b[0m', '🔍 Scanning manifest.json for assets...');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const assetsToCheck = new Set();

    // 1. Collect Icons
    if (manifest.icons) {
        manifest.icons.forEach(icon => assetsToCheck.add(icon.src));
    }

    // 2. Collect Shortcuts
    if (manifest.shortcuts) {
        manifest.shortcuts.forEach(shortcut => {
            if (shortcut.icons) {
                shortcut.icons.forEach(icon => assetsToCheck.add(icon.src));
            }
        });
    }

    // 3. Collect Screenshots
    if (manifest.screenshots) {
        manifest.screenshots.forEach(screenshot => assetsToCheck.add(shortcut.src || screenshot.src));
    }

    // 4. Proprietary keys
    if (manifest.apple_touch_icon) assetsToCheck.add(manifest.apple_touch_icon);

    let missingCount = 0;
    console.log(`Found ${assetsToCheck.size} unique assets to verify.\n`);

    assetsToCheck.forEach(assetPath => {
        // Manifest paths are relative to the manifest location
        const fullPath = path.join(baseDir, assetPath);
        if (fs.existsSync(fullPath)) {
            console.log('\x1b[32m%s\x1b[0m', `  ✅ Found: ${assetPath}`);
        } else {
            console.log('\x1b[31m%s\x1b[0m', `  ❌ Missing: ${assetPath}`);
            missingCount++;
        }
    });

    if (missingCount === 0) {
        console.log('\n\x1b[32m%s\x1b[0m', '🚀 All PWA assets are verified and ready for deployment!');
    } else {
        console.log('\n\x1b[31m%s\x1b[0m', `⚠️  Warning: ${missingCount} assets are missing. Your PWA might not install correctly.`);
    }
}

verifyPwaAssets();