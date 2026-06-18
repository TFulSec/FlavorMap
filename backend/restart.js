#!/usr/bin/env node
const { exec, execSync } = require('child_process');
const path = require('path');

const backendPath = path.resolve(__dirname, 'src', 'app.js');
const processName = 'node';

console.log('⏹️  Stopping existing Node processes...');
try {
  execSync('taskkill /IM node.exe /F /T', { stdio: 'ignore' });
  console.log('✅ Stopped');
} catch (e) {
  console.log('ℹ️  No existing processes');
}

console.log('\n⏳ Waiting 2 seconds...');
setTimeout(() => {
  console.log('\n🚀 Starting backend server...');
  console.log(`📂 Backend path: ${backendPath}`);
  console.log('🔗 Connecting to: localhost\\SQLEXPRESS (Windows Auth)');
  console.log('\n');
  
  const backend = exec(`"${process.execPath}" "${backendPath}"`, {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  backend.on('error', (err) => {
    console.error('❌ Backend error:', err);
  });
  
  backend.on('exit', (code) => {
    console.log(`\n⏹️  Backend stopped with code ${code}`);
  });
}, 2000);
