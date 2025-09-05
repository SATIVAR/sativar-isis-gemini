const { spawn } = require('child_process');
const path = require('path');

// Função para executar comandos
function runCommand(command, args, cwd, name) {
  return new Promise((resolve, reject) => {
    console.log(`Starting ${name}...`);
    const process = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    });

    process.on('error', (error) => {
      console.error(`Error starting ${name}:`, error);
      reject(error);
    });

    process.on('exit', (code) => {
      if (code !== 0) {
        console.error(`${name} exited with code ${code}`);
        reject(new Error(`${name} failed`));
      } else {
        console.log(`${name} completed successfully`);
        resolve();
      }
    });
  });
}

async function startServer() {
  try {
    const serverDir = path.join(__dirname, 'server');
    
    // Instalar dependências do servidor se necessário
    console.log('Installing server dependencies...');
    await runCommand('npm', ['install'], serverDir, 'Server Dependencies');
    
    // Iniciar o servidor
    console.log('Starting backend server...');
    runCommand('node', ['index.js'], serverDir, 'Backend Server');
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();