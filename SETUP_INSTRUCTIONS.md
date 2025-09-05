# SATIVAR-ISIS - Instruções de Configuração

## Pré-requisitos

1. **Docker e Docker Compose** instalados
2. **Node.js** (versão 16 ou superior)
3. **npm** ou **yarn**

## Configuração do Banco de Dados

### 1. Iniciar o PostgreSQL com Docker

```bash
# Iniciar os containers do PostgreSQL e Adminer
docker-compose up -d

# Verificar se os containers estão rodando
docker ps
```

### 2. Verificar a Conexão

- Acesse o Adminer em: http://localhost:8080
- Use as credenciais:
  - **Sistema**: PostgreSQL
  - **Servidor**: postgres
  - **Usuário**: admin
  - **Senha**: sativarisisv25
  - **Base de dados**: sativar_isis

### 3. Executar o Script de Inicialização (Opcional)

Se as tabelas não foram criadas automaticamente:

```sql
-- Execute o conteúdo do arquivo init-scripts/init.sql no Adminer
-- Ou execute via linha de comando:
docker exec -i meu_app_postgres psql -U admin -d sativar_isis < init-scripts/init.sql
```

## Configuração da Aplicação

### 1. Instalar Dependências

```bash
# Instalar dependências do frontend
npm install

# Instalar dependências do servidor (opcional)
cd server
npm install
cd ..
```

### 2. Configurar Variáveis de Ambiente

Verifique se o arquivo `.env` está configurado corretamente:

```env
VITE_DB_HOST=postgres
VITE_DB_PORT=5432
VITE_DB_USER=admin
VITE_DB_PASSWORD=sativarisisv25
VITE_DB_NAME=sativar_isis
```

### 3. Executar a Aplicação

#### Opção 1: Apenas Frontend (Recomendado para desenvolvimento)
```bash
npm run dev
```

#### Opção 2: Frontend + Backend
```bash
npm run dev:full
```

#### Opção 3: Apenas Backend
```bash
npm run server
```

## Funcionalidades

### Modo Híbrido
A aplicação funciona em modo híbrido:
- **Com Backend**: Usa PostgreSQL para persistência de dados
- **Sem Backend**: Usa localStorage como fallback

### Migração Automática
- A aplicação detecta dados existentes no localStorage
- Migra automaticamente para o PostgreSQL quando disponível
- Mantém sincronização entre localStorage e banco de dados

### Recursos Implementados

1. **Configurações da Associação**
   - Nome, endereço, contatos
   - Produtos e preços
   - Configurações de pagamento

2. **Sistema de Lembretes**
   - Criação e gerenciamento de tarefas
   - Notificações automáticas
   - Recorrência de lembretes

3. **Gerador de Orçamentos**
   - Processamento de receitas médicas
   - Geração automática de orçamentos
   - Integração com IA (Gemini)

4. **Administração**
   - Sistema de login/registro
   - Painel administrativo
   - Gerenciamento de usuários

## Solução de Problemas

### Problema: Aplicação trava na inicialização
**Solução**: Execute apenas o frontend:
```bash
npm run dev
```

### Problema: Erro de conexão com PostgreSQL
**Solução**: 
1. Verifique se o Docker está rodando
2. Reinicie os containers: `docker-compose restart`
3. Verifique as credenciais no `.env`

### Problema: Dados não são salvos
**Solução**:
1. A aplicação usa localStorage como fallback
2. Verifique se o backend está rodando para persistência no PostgreSQL
3. Execute as migrações manualmente se necessário

### Problema: Servidor Node.js não inicia
**Solução**:
1. Instale as dependências: `cd server && npm install`
2. Verifique se a porta 3001 está livre
3. Use apenas o frontend se o backend não for necessário

## Estrutura do Projeto

```
├── components/          # Componentes React
├── hooks/              # Hooks customizados
├── services/           # Serviços de banco de dados
│   └── database/       # Camada de abstração do BD
├── server/             # Backend Node.js/Express
├── init-scripts/       # Scripts de inicialização do BD
├── utils/              # Utilitários
└── types.ts           # Definições de tipos TypeScript
```

## Próximos Passos

1. **Produção**: Configure variáveis de ambiente para produção
2. **Segurança**: Implemente hash de senhas e autenticação JWT
3. **Backup**: Configure backup automático do PostgreSQL
4. **Monitoramento**: Adicione logs e métricas de performance

## Suporte

Para problemas ou dúvidas:
1. Verifique os logs no console do navegador
2. Verifique os logs do Docker: `docker-compose logs`
3. Consulte a documentação do PostgreSQL e React