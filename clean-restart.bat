@echo off
echo ========================================
echo    SATIVAR-ISIS - Limpeza Completa
echo ========================================

echo.
echo 1. Parando todos os processos...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im vite.exe >nul 2>&1

echo 2. Parando e removendo containers...
docker-compose down -v
timeout /t 3

echo 3. Limpando cache do npm...
npm cache clean --force >nul 2>&1

echo 4. Removendo node_modules...
if exist node_modules rmdir /s /q node_modules
if exist server\node_modules rmdir /s /q server\node_modules

echo 5. Reinstalando dependencias...
npm install
cd server && npm install && cd ..

echo 6. Iniciando containers limpos...
docker-compose up -d postgres
timeout /t 10

echo.
echo ========================================
echo    Limpeza concluida!
echo ========================================
echo.
echo Execute 'fix-and-start.bat' para iniciar o sistema
echo.
pause