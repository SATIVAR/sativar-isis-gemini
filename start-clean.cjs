const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function killProcessOnPort(port) {
  try {
    console.log(`Verificando porta ${port}...`);
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    
    if (stdout.trim()) {
      const lines = stdout.trim().split('\n');
      const pids = new Set();
      
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[3] === 'LISTENING') {
          const pid = parts[4];
          if (pid !== '0') {
            pids.add(pid);
          }
        }
      });
      
      for (const pid of pids) {
        console.log(`Matando processo ${pid} na porta ${port}...`);
        try {
          await execAsync(`taskkill /PID ${pid} /F`);
          console.log(`✅ Processo ${pid} finalizado`);
        } catch (error) {
          console.log(`⚠️ Não foi possível matar o processo ${pid}`);
        }
      }
      
      // Aguardar um pouco para a porta ser liberada
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log(`✅ Porta ${port} está livre`);
    }
  } catch (error) {
    console.log(`✅ Porta ${port} está livre`);
  }
}

async function checkDocker() {
  try {
    await execAsync('docker ps');
    console.log('✅ Docker está rodando');
    return true;
  } catch (error) {
    console.error('❌ Docker não está rodando. Por favor, inicie o Docker primeiro.');
    return false;
  }
}

async function checkPostgres() {
  try {
    const { stdout } = await execAsync('docker ps | findstr postgres');
    if (stdout.trim()) {
      console.log('✅ PostgreSQL está rodando');
      return true;
    } else {
      console.log('🔄 Iniciando PostgreSQL...');
      await execAsync('docker-compose up -d postgres');
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('✅ PostgreSQL iniciado');
      return true;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar/iniciar PostgreSQL:', error.message);
    return false;
  }
}

async function startServer() {
  console.log('🚀 Iniciando servidor backend...');
  
  const serverProcess = spawn('node', ['index.js'], {
    cwd: './server',
    stdio: 'inherit',
    shell: true
  });

  serverProcess.on('error', (error) => {
    console.error('❌ Erro ao iniciar servidor:', error);
  });

  return serverProcess;
}

async function startFrontend() {
  console.log('🎨 Iniciando frontend...');
  
  const frontendProcess = spawn('npm', ['run', 'dev:frontend'], {
    stdio: 'inherit',
    shell: true
  });

  frontendProcess.on('error', (error) => {
    console.error('❌ Erro ao iniciar frontend:', error);
  });

  return frontendProcess;
}

async function main() {
  console.log('🔧 SATIVAR-ISIS - Inicialização Limpa\n');

  // Verificar Docker
  if (!(await checkDocker())) {
    process.exit(1);
  }

  // Verificar/Iniciar PostgreSQL
  if (!(await checkPostgres())) {
    process.exit(1);
  }

  // Limpar portas
  await killProcessOnPort(3001);
  await killProcessOnPort(5173);

  console.log('\n📡 Iniciando serviços...\n');

  // Iniciar servidor
  const serverProcess = await startServer();
  
  // Aguardar servidor inicializar
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Iniciar frontend
  const frontendProcess = await startFrontend();

  console.log('\n✅ Aplicação iniciada com sucesso!');
  console.log('📍 URLs:');
  console.log('   Frontend: http://localhost:5173');
  console.log('   Backend:  http://localhost:3001');
  console.log('   Adminer:  http://localhost:8080');
  console.log('\n⏹️  Para parar: Ctrl+C\n');

  // Lidar com encerramento
  process.on('SIGINT', () => {
    console.log('\n🛑 Encerrando aplicação...');
    serverProcess.kill();
    frontendProcess.kill();
    process.exit(0);
  });

  // Manter o processo vivo
  process.stdin.resume();
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});