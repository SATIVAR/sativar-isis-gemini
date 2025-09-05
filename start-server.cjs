const { spawn } = require('child_process');
const path = require('path');

async function startServer() {
  try {
    const serverDir = path.join(__dirname, 'server');
    
    console.log('Starting backend server...');
    console.log('Server directory:', serverDir);
    
    const serverProcess = spawn('node', ['index.js'], {
      cwd: serverDir,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env }
    });

    serverProcess.on('error', (error) => {
      console.error('Error starting server:', error);
      process.exit(1);
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Server exited with code ${code}`);
        process.exit(code);
      }
    });

    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('Shutting down server...');
      serverProcess.kill('SIGINT');
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();