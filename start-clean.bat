@echo off
echo ========================================
echo SATIVAR-ISIS - Inicializacao Limpa
echo ========================================

echo.
echo 1. Parando containers existentes...
docker-compose down

echo.
echo 2. Iniciando PostgreSQL e Adminer...
docker-compose up -d

echo.
echo 3. Aguardando banco de dados...
timeout /t 8 /nobreak > nul

echo.
echo 4. Iniciando aplicacao...
npm run dev

pause