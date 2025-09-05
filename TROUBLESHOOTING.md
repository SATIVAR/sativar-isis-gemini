# Guia de Solução de Problemas - SATIVAR ISIS

## Problemas Comuns e Soluções

### 1. Erro 500 - Internal Server Error

**Sintomas:**
- `Failed to load resource: the server responded with a status of 500`
- `GET http://localhost:5173/api/db/status net::ERR_ABORTED 500`

**Soluções:**

#### A. Verificar se o servidor backend está rodando
```bash
# Verificar se há processo na porta 3001
netstat -ano | findstr :3001

# Se não houver, iniciar o servidor
cd server
node index.js
```

#### B. Verificar conexão com banco de dados
```bash
# Testar conexão
node test-connection.cjs

# Verificar se PostgreSQL está rodando
docker ps
```

#### C. Matar processos conflitantes
```bash
# Encontrar processo na porta 3001
netstat -ano | findstr :3001

# Matar processo (substitua XXXX pelo PID)
taskkill /PID XXXX /F
```

### 2. Erro de Conexão com Banco de Dados

**Sintomas:**
- `Error connecting to PostgreSQL`
- `ECONNREFUSED`

**Soluções:**

#### A. Verificar se PostgreSQL está rodando
```bash
docker ps | findstr postgres
```

#### B. Iniciar PostgreSQL se necessário
```bash
docker-compose up -d postgres
```

#### C. Verificar configurações do .env
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=sativarisisv25
DB_NAME=sativar_isis
```

### 3. Erro de Porta em Uso

**Sintomas:**
- `Error: listen EADDRINUSE: address already in use :::3001`

**Solução:**
```bash
# Encontrar e matar processo
netstat -ano | findstr :3001
taskkill /PID [PID_NUMBER] /F
```

### 4. Problemas com Migrações

**Sintomas:**
- Tabelas não existem
- Dados não aparecem

**Soluções:**

#### A. Executar migrações manualmente
```bash
cd server
node index.js
```

#### B. Verificar tabelas no Adminer
- Acesse: http://localhost:8080
- Sistema: PostgreSQL
- Servidor: postgres
- Usuário: admin
- Senha: sativarisisv25

### 5. Frontend não carrega

**Sintomas:**
- Página em branco
- Erro de conexão

**Soluções:**

#### A. Verificar se Vite está rodando
```bash
npm run dev:frontend
```

#### B. Limpar cache
```bash
rm -rf node_modules
npm install
```

## Scripts Úteis

### Inicialização Completa
```bash
# Usar o script batch (Windows)
run-app.bat

# Ou manualmente
docker-compose up -d postgres
npm run dev
```

### Testes de Conexão
```bash
# Testar banco de dados
node test-connection.cjs

# Testar servidor
node test-server.cjs
```

### Reset Completo
```bash
# Parar tudo
docker-compose down

# Remover volumes (CUIDADO: apaga dados)
docker-compose down -v

# Reiniciar
docker-compose up -d postgres
npm run dev
```

## Logs e Debugging

### Verificar logs do PostgreSQL
```bash
docker-compose logs postgres
```

### Verificar logs do servidor
- Os logs aparecem no terminal onde o servidor está rodando
- Procure por erros de conexão ou SQL

### Console do navegador
- Abra F12 no navegador
- Verifique a aba Console para erros JavaScript
- Verifique a aba Network para erros de API

## Contatos de Suporte

Se os problemas persistirem:
1. Verifique os logs detalhados
2. Documente o erro exato
3. Entre em contato com o suporte técnico

## Comandos de Emergência

### Matar todos os processos Node.js
```bash
taskkill /f /im node.exe
```

### Reiniciar Docker
```bash
docker-compose down
docker-compose up -d
```

### Verificar portas em uso
```bash
netstat -ano | findstr :3001
netstat -ano | findstr :5173
netstat -ano | findstr :5432
```