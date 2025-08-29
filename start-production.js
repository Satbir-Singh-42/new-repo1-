#!/usr/bin/env node

/**
 * Production startup script for SolarScope AI
 * Handles environment validation and server initialization
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment validation
const requiredEnvVars = ['DATABASE_URL', 'GOOGLE_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease ensure all required environment variables are set before starting the production server.');
  process.exit(1);
}

// Validate Google API key format
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey || apiKey.length < 30) {
  console.error('❌ Invalid GOOGLE_API_KEY format. Please ensure you have a valid Google AI API key.');
  process.exit(1);
}

// Validate database URL format
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl.startsWith('postgresql://')) {
  console.error('❌ Invalid DATABASE_URL format. Expected PostgreSQL connection string.');
  process.exit(1);
}

console.log('✅ Environment validation passed');
console.log('🚀 Starting SolarScope AI production server...');

// Set production environment
process.env.NODE_ENV = 'production';

// Start the production server with production environment
const serverPath = path.join(__dirname, 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

// Handle server process events
server.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});

server.on('exit', (code, signal) => {
  if (signal) {
    console.log(`🛑 Server terminated by signal: ${signal}`);
  } else if (code !== 0) {
    console.error(`❌ Server exited with code: ${code}`);
    process.exit(code);
  } else {
    console.log('✅ Server shut down gracefully');
  }
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  server.kill('SIGINT');
});