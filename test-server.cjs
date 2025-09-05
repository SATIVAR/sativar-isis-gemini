const { spawn } = require('child_process');
const path = require('path');

// Teste rápido do servidor
const serverDir = path.join(__dirname, 'server');

console.log('Testing server startup...');
console.log('Server directory:', serverDir);

const serverProcess = spawn('node', ['index.js'], {
  cwd: serverDir,
  stdio: 'pipe',
  shell: true,
  env: { ...process.env }
});

let output = '';
let errorOutput = '';

serverProcess.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  console.log('STDOUT:', text.trim());
});

serverProcess.stderr.on('data', (data) => {
  const text = data.toString();
  errorOutput += text;
  console.error('STDERR:', text.trim());
});

serverProcess.on('error', (error) => {
  console.error('Process error:', error);
});

// Mata o processo após 10 segundos para teste
setTimeout(() => {
  console.log('\n--- Test Results ---');
  console.log('Output:', output);
  if (errorOutput) {
    console.log('Errors:', errorOutput);
  }
  serverProcess.kill();
  process.exit(0);
}, 10000);