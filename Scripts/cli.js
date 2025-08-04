#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RAZORPAY_ENV_FILE = '.razorpay.env';
const ENV_FILE_PATH = path.join(process.cwd(), RAZORPAY_ENV_FILE);

function readEnvFile() {
  if (!fs.existsSync(ENV_FILE_PATH)) {
    return {};
  }
  
  const content = fs.readFileSync(ENV_FILE_PATH, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split('=', 2);
      if (key && value) {
        env[key.trim()] = value.trim();
      }
    }
  });
  
  return env;
}

function writeEnvFile(env) {
  const content = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n') + '\n';
  
  fs.writeFileSync(ENV_FILE_PATH, content);
  console.log(`✅ Updated ${RAZORPAY_ENV_FILE}`);
}

function runPodInstall() {
  const iosPath = path.join(process.cwd(), 'ios');
  if (fs.existsSync(iosPath)) {
    console.log('🔄 Running pod install...');
    try {
      execSync('pod install', { cwd: iosPath, stdio: 'inherit' });
      console.log('✅ Pod install completed');
    } catch (error) {
      console.error('❌ Pod install failed:', error.message);
      process.exit(1);
    }
  } else {
    console.log('ℹ️  No ios directory found, skipping pod install');
  }
}

function enableTurbo() {
  console.log('🚀 Enabling Razorpay Turbo...');
  const env = readEnvFile();
  env.RAZORPAY_TURBO = 'true';
  writeEnvFile(env);
  runPodInstall();
  console.log('✅ Razorpay Turbo enabled successfully!');
}

function disableTurbo() {
  console.log('🔄 Disabling Razorpay Turbo...');
  const env = readEnvFile();
  env.RAZORPAY_TURBO = 'false';
  writeEnvFile(env);
  console.log('✅ Razorpay Turbo disabled successfully!');
  console.log('ℹ️  Run "cd ios && pod install" to apply changes');
}

function syncTurbo() {
  console.log('🔄 Syncing Razorpay configuration...');
  const env = readEnvFile();
  const turboEnabled = env.RAZORPAY_TURBO === 'true';
  
  console.log(`ℹ️  Current Turbo status: ${turboEnabled ? 'ENABLED' : 'DISABLED'}`);
  runPodInstall();
  console.log('✅ Sync completed!');
  console.log(`💡 Tip: Turbo status is now available as a compile-time flag (RAZORPAY_TURBO_ENABLED) in your iOS bridge!`);
}

function showStatus() {
  const env = readEnvFile();
  const turboEnabled = env.RAZORPAY_TURBO === 'true';
  
  console.log('📊 Razorpay Configuration Status:');
  console.log(`   Turbo: ${turboEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
  
  if (fs.existsSync(ENV_FILE_PATH)) {
    console.log(`   Config file: ${ENV_FILE_PATH}`);
  } else {
    console.log('   Config file: Not found (using defaults)');
  }
}

function showHelp() {
  console.log(`
🎯 Razorpay Turbo CLI

Usage: npx razorpay-turbo <command>

Commands:
  on        Enable Razorpay Turbo and run pod install
  off       Disable Razorpay Turbo  
  sync      Re-evaluate configuration and run pod install
  status    Show current configuration status
  help      Show this help message

Examples:
  npx razorpay-turbo on      # Enable Turbo
  npx razorpay-turbo off     # Disable Turbo
  npx razorpay-turbo sync    # Sync changes
  npx razorpay-turbo status  # Check status

🚀 New Feature: Compile-time Flags
When Turbo is enabled, a preprocessor definition RAZORPAY_TURBO_ENABLED=1 
is automatically set during pod install. Your iOS bridge can check this 
flag at compile-time for better performance:

#ifdef RAZORPAY_TURBO_ENABLED
    // Use Turbo functionality
#else  
    // Use standard functionality
#endif
`);
}

function main() {
  const command = process.argv[2];

  switch (command) {
    case 'on':
      enableTurbo();
      break;
    case 'off':
      disableTurbo();
      break;
    case 'sync':
      syncTurbo();
      break;
    case 'status':
      showStatus();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.log('❌ Unknown command:', command);
      showHelp();
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  enableTurbo,
  disableTurbo,
  syncTurbo,
  showStatus,
  readEnvFile,
  writeEnvFile
}; 