@echo off
echo ========================================
echo  SATIVAR-ISIS - Sistema Refatorado
echo ========================================

echo.
echo 1. Parando processos anteriores...
taskkill /f /im node.exe 2>nul
docker-compose down 2>nul

echo.
echo 2. Iniciando PostgreSQL no Docker...
docker-compose up -d postgres

echo.
echo 3. Aguardando banco de dados...
timeout /t 8 /nobreak > nul

echo.
echo 4. Instalando dependencias...
npm install

echo.
echo 5. Iniciando aplicacao refatorada...
echo Frontend: http://localhost:5173
echo API: http://localhost:3001
echo Database Admin: http://localhost:8080
echo.
npm run dev

pause