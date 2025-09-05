@echo off
echo ========================================
echo  SATIVAR-ISIS - Inicializacao Simples
echo ========================================

echo.
echo 1. Iniciando PostgreSQL no Docker...
docker-compose up -d postgres

echo.
echo 2. Aguardando banco de dados...
timeout /t 5 /nobreak > nul

echo.
echo 3. Instalando dependencias...
npm install

echo.
echo 4. Iniciando aplicacao...
npm run dev

pause