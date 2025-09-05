# Arquitetura do Sistema SATIVAR-ISIS

## Visão Geral

O SATIVAR-ISIS é um sistema de 3 camadas:

```
┌─────────────────────────────────────────┐
│           FRONTEND (React)              │
│         http://localhost:5173           │
│                                         │
│  - Interface do usuário                 │
│  - Processamento de receitas            │
│  - Geração de orçamentos                │
│  - Configurações                        │
└─────────────────┬───────────────────────┘
                  │ HTTP Requests
                  │ (via Vite Proxy)
┌─────────────────▼───────────────────────┐
│           BACKEND (Express)             │
│         http://localhost:3001           │
│                                         │
│  - API REST (/api/*)                    │
│  - Conexão com PostgreSQL               │
│  - Migrações automáticas                │
│  - Transações de banco                  │
└─────────────────┬───────────────────────┘
                  │ SQL Queries
                  │ (pg library)
┌─────────────────▼───────────────────────┐
│        POSTGRESQL (Docker)              │
│         localhost:5432                  │
│                                         │
│  - Banco de dados principal             │
│  - Persistência de dados                │
│  - Tabelas: settings, products, etc.    │
└─────────────────────────────────────────┘
```

## Fluxo de Dados

### 1. Desenvolvimento (npm run dev)
- **Frontend**: Vite dev server na porta 5173
- **Backend**: Express server na porta 3001
- **Proxy**: Vite redireciona `/api/*` para `localhost:3001`
- **Banco**: PostgreSQL no Docker (porta 5432)

### 2. Produção (npm start)
- **Frontend**: Build estático servido pelo Express
- **Backend**: Express server na porta 3001
- **Banco**: PostgreSQL no Docker (porta 5432)

## Endpoints da API

### Backend (Express - porta 3001)
- `POST /api/db/query` - Executa query SQL
- `POST /api/db/transaction` - Executa transação
- `GET /api/db/status` - Status da conexão
- `GET /api/health` - Health check

### Adminer (porta 8080)
- Interface web para gerenciar PostgreSQL
- Acesso direto ao banco de dados

## Configuração de Ambiente

### .env
```env
# Backend - Conexão com PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=sativarisisv25
DB_NAME=sativar_isis

# Frontend - URL da API
VITE_API_URL=http://localhost:3001

# IA
GEMINI_API_KEY=sua_chave_aqui
```

## Como Usar

### Desenvolvimento
```bash
npm run dev
# ou manualmente:
npm run dev:manual
```

### Produção
```bash
npm run build
npm start
```

### Apenas Backend
```bash
npm run server
```

### Apenas Frontend
```bash
npm run dev:frontend
```

## URLs de Acesso

- **Aplicação Principal**: http://localhost:5173
- **API Backend**: http://localhost:3001/api
- **Adminer (DB)**: http://localhost:8080
- **Health Check**: http://localhost:3001/api/health

## Importante

- **NUNCA** acesse `http://localhost:3001` diretamente no navegador
- Use sempre `http://localhost:5173` para a aplicação
- O backend serve apenas a API e arquivos estáticos em produção
- O Vite proxy redireciona automaticamente as chamadas da API