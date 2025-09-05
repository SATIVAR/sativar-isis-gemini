@echo off
echo Iniciando SATIVAR-ISIS...
echo.

echo Verificando se o Docker esta rodando...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Docker nao esta rodando. Por favor, inicie o Docker primeiro.
    pause
    exit /b 1
)

echo Verificando se o PostgreSQL esta rodando...
docker ps | findstr postgres >nul
if %errorlevel% neq 0 (
    echo Iniciando PostgreSQL...
    docker-compose up -d postgres
    timeout /t 5 >nul
)

echo.
echo Iniciando servidor backend e frontend...
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo Adminer: http://localhost:8080
echo.

start "Backend Server" cmd /k "cd server && node index.js"
timeout /t 3 >nul
start "Frontend Dev" cmd /k "npm run dev:frontend"

echo.
echo Aplicacao iniciada com sucesso!
echo Para parar a aplicacao, feche as janelas do terminal.
echo.
pause