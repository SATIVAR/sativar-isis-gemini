@echo off
echo ========================================
echo SATIVAR-ISIS - Sistema de Desenvolvimento
echo ========================================
echo.
echo Iniciando PostgreSQL (Docker)...
docker-compose up -d postgres
echo.
echo Aguardando banco de dados...
timeout /t 5 /nobreak > nul
echo.
echo Iniciando Backend (porta 3001)...
start "Backend Server" cmd /k "cd server && node index.js"
echo.
echo Aguardando backend...
timeout /t 3 /nobreak > nul
echo.
echo Iniciando Frontend (porta 5173)...
start "Frontend Dev" cmd /k "npm run dev:frontend"
echo.
echo ========================================
echo Sistema iniciado com sucesso!
echo ========================================
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:3001/api
echo Adminer: http://localhost:8080
echo ========================================
echo.
echo Pressione qualquer tecla para sair...
pause > nul