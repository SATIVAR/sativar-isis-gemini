@echo off
echo ========================================
echo    SATIVAR-ISIS - Correcao e Inicio
echo ========================================

echo.
echo 1. Parando processos existentes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 >nul

echo 2. Parando containers Docker...
docker-compose down >nul 2>&1

echo 3. Iniciando PostgreSQL...
docker-compose up -d postgres
timeout /t 5

echo 4. Verificando se PostgreSQL esta pronto...
:wait_postgres
docker exec meu_app_postgres pg_isready -U admin -d sativar_isis >nul 2>&1
if errorlevel 1 (
    echo    Aguardando PostgreSQL...
    timeout /t 2 >nul
    goto wait_postgres
)
echo    PostgreSQL esta pronto!

echo.
echo 5. Iniciando servidor backend...
start "SATIVAR-ISIS Backend" cmd /k "cd /d %~dp0 && npm run server"
timeout /t 3

echo 6. Iniciando frontend...
start "SATIVAR-ISIS Frontend" cmd /k "cd /d %~dp0 && npm run dev:frontend"

echo.
echo ========================================
echo    SATIVAR-ISIS iniciado com sucesso!
echo ========================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3001/api
echo Adminer:  http://localhost:8080
echo.
echo Pressione qualquer tecla para fechar...
pause >nul