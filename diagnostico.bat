@echo off
echo ========================================
echo SATIVAR-ISIS - Diagnostico do Sistema
echo ========================================

echo.
echo [1] Verificando Docker...
docker --version
if errorlevel 1 (
    echo ERRO: Docker nao instalado
) else (
    echo OK: Docker instalado
)

echo.
echo [2] Verificando containers Docker...
docker ps --filter "name=meu_app"

echo.
echo [3] Testando conexao PostgreSQL...
node test-connection.cjs
if errorlevel 1 (
    echo ERRO: Falha na conexao PostgreSQL
) else (
    echo OK: PostgreSQL conectado
)

echo.
echo [4] Testando API Backend...
curl -s http://localhost:3001/api/health
if errorlevel 1 (
    echo ERRO: API Backend nao responde
) else (
    echo OK: API Backend funcionando
)

echo.
echo [5] Testando status do banco via API...
curl -s http://localhost:3001/api/db/status

echo.
echo [6] Verificando processos Node.js...
tasklist /FI "IMAGENAME eq node.exe" /FO TABLE

echo.
echo ========================================
echo Diagnostico concluido
echo ========================================
pause