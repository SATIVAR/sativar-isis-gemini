@echo off
echo ========================================
echo SATIVAR-ISIS - Inicializacao Completa
echo ========================================

echo.
echo [1/4] Verificando Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Docker nao encontrado. Instale o Docker Desktop.
    pause
    exit /b 1
)

echo [2/4] Iniciando containers PostgreSQL e Adminer...
docker-compose up -d
if errorlevel 1 (
    echo ERRO: Falha ao iniciar containers Docker.
    pause
    exit /b 1
)

echo [3/4] Aguardando PostgreSQL inicializar...
timeout /t 5 /nobreak >nul

echo [4/4] Testando conexao com banco de dados...
node test-connection.cjs
if errorlevel 1 (
    echo ERRO: Falha na conexao com o banco de dados.
    echo Verifique se o PostgreSQL esta rodando corretamente.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Inicializacao concluida com sucesso!
echo ========================================
echo.
echo Servicos disponiveis:
echo - PostgreSQL: localhost:5432
echo - Adminer: http://localhost:8080
echo - API Backend: http://localhost:3001
echo - Frontend: http://localhost:5173
echo.
echo Iniciando servidor backend...
echo.

start "SATIVAR-ISIS Backend" cmd /k "node server-simple.cjs"

echo Aguardando backend inicializar...
timeout /t 3 /nobreak >nul

echo Iniciando frontend...
start "SATIVAR-ISIS Frontend" cmd /k "npm run dev:frontend"

echo.
echo ========================================
echo SATIVAR-ISIS iniciado com sucesso!
echo ========================================
echo.
echo Acesse: http://localhost:5173
echo.
pause