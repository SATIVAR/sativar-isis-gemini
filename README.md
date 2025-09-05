# SATIVAR - ISIS

Sistema de Processamento de Receitas Médicas com IA e Banco de Dados PostgreSQL

## Descrição

O SATIVAR-ISIS é um sistema inteligente para processamento de receitas médicas que utiliza IA para extrair informações de prescrições e gerar orçamentos automatizados. O sistema oferece funcionalidades de gerenciamento de configurações, lembretes e histórico de orçamentos, com persistência de dados em PostgreSQL.

## Funcionalidades

- **Processamento de Receitas**: Upload e análise automática de receitas médicas em PDF ou imagem
- **Geração de Orçamentos**: Criação automática de orçamentos baseados nos produtos cadastrados
- **Gerenciamento de Produtos**: Cadastro e edição de produtos com preços e descrições
- **Sistema de Lembretes**: Criação e gerenciamento de tarefas e lembretes
- **Configurações da Associação**: Personalização completa das informações da empresa
- **Autenticação Admin**: Sistema de login para administradores
- **Banco de Dados PostgreSQL**: Persistência segura de todos os dados
- **Migrações Automáticas**: Sistema de migração de dados do localStorage para PostgreSQL

## Tecnologias

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Node.js + Express
- **Banco de Dados**: PostgreSQL 13
- **Containerização**: Docker + Docker Compose
- **IA**: Google Gemini API
- **Estilização**: Tailwind CSS
- **PDF**: jsPDF para geração de documentos

## Pré-requisitos

- Node.js 18+ 
- Docker e Docker Compose
- Git

## Instalação e Configuração

### 1. Clone o repositório:
```bash
git clone [url-do-repositorio]
cd sativar-isis
```

### 2. Configure as variáveis de ambiente:
Crie um arquivo `.env` na raiz do projeto:
```env
# Gemini API
GEMINI_API_KEY=sua_chave_do_gemini_aqui

# Database Configuration
VITE_DB_HOST=localhost
VITE_DB_PORT=5432
VITE_DB_USER=admin
VITE_DB_PASSWORD=sativarisisv25
VITE_DB_NAME=sativar_isis

# Server Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=sativarisisv25
DB_NAME=sativar_isis
```

### 3. Instale as dependências:
```bash
npm install
```

### 4. Execute o projeto em modo desenvolvimento:
```bash
npm run dev
```

O comando `npm run dev` automaticamente:
- Inicia o PostgreSQL e Adminer via docker-compose
- Inicia o servidor backend na porta 3001
- Inicia o frontend na porta 5173

### 6. Acesse a aplicação:
- **Aplicação**: http://localhost:5173
- **Adminer (Gerenciador de BD)**: http://localhost:8080
  - Sistema: PostgreSQL
  - Servidor: postgres
  - Usuário: admin
  - Senha: sativarisisv25
  - Base de dados: sativar_isis

## Comandos Disponíveis

```bash
# Desenvolvimento (docker + backend + frontend)
npm run dev

# Apenas o servidor backend
npm run server

# Build para produção
npm run build

# Executar em produção
npm start

# Gerenciar containers Docker
npm run docker:up      # Iniciar PostgreSQL e Adminer
npm run docker:down    # Parar todos os containers
npm run docker:restart # Reiniciar containers
npm run docker:logs    # Ver logs dos containers

# Inicialização limpa (Windows)
start-clean.bat
```

## Migração de Dados

O sistema possui migração automática que:

1. **Detecta dados existentes** no localStorage
2. **Executa migrações** do banco de dados automaticamente
3. **Migra dados** do localStorage para PostgreSQL
4. **Preserva dados** existentes durante a transição
5. **Oferece fallback** para localStorage em caso de problemas

### Processo de Migração:

1. Na primeira execução, o sistema:
   - Cria as tabelas no PostgreSQL
   - Migra dados do localStorage (se existirem)
   - Mantém backup no localStorage

2. Em execuções subsequentes:
   - Usa PostgreSQL como fonte principal
   - localStorage como backup/fallback

## Estrutura do Banco de Dados

```sql
-- Tabelas principais:
- settings          # Configurações da associação
- products          # Catálogo de produtos
- reminders         # Sistema de lembretes
- tasks            # Tarefas dos lembretes
- quotes           # Histórico de orçamentos
- quoted_products  # Produtos dos orçamentos
- admin_users      # Usuários administradores
- schema_migrations # Controle de migrações
```

## Configuração Inicial

### 1. Primeiro Acesso:
- O sistema executará migrações automaticamente
- Registre um superadministrador
- Configure as informações da associação

### 2. Cadastro de Produtos:
- Acesse "Configurações" → "Produtos"
- Adicione os produtos disponíveis com preços

### 3. Configuração da Associação:
- Preencha todas as informações da empresa
- Configure dados bancários para pagamentos

## Uso do Sistema

### Processamento de Receitas
1. Na tela principal, clique em "Anexar Arquivo"
2. Selecione uma receita médica (PDF ou imagem)
3. Aguarde o processamento automático pela IA
4. Revise o orçamento gerado
5. Copie a mensagem para enviar ao paciente

### Gerenciamento de Lembretes
1. Acesse "Configurações" → "Lembretes"
2. Clique em "Novo Lembrete"
3. Preencha as informações e tarefas
4. Configure notificações se necessário

### Administração do Banco de Dados
- Use o **Adminer** em http://localhost:8080
- Visualize, edite e gerencie dados diretamente
- Execute consultas SQL personalizadas
- Faça backup e restore dos dados

## Estrutura do Projeto

```
├── components/              # Componentes React
├── hooks/                  # Hooks customizados
├── services/
│   ├── database/          # Serviços de banco de dados
│   │   ├── repositories/  # Repositórios (padrão Repository)
│   │   ├── migrations.ts  # Sistema de migrações
│   │   ├── apiClient.ts   # Cliente da API
│   │   └── dataMigration.ts # Migração de dados
│   └── geminiService.ts   # Serviço da IA
├── server/                # Backend Express
├── init-scripts/          # Scripts de inicialização do BD
├── docker-compose.yml     # Configuração Docker
└── types.ts              # Definições de tipos
```

## Troubleshooting

### Problemas Comuns:

1. **Erro de conexão com banco:**
   ```bash
   docker-compose restart postgres
   npm run server
   ```

2. **Dados não aparecem:**
   - Verifique se as migrações rodaram
   - Acesse o Adminer para verificar as tabelas
   - Verifique os logs do console

3. **Erro de permissão:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

4. **Reset completo:**
   ```bash
   docker-compose down -v  # Remove volumes
   docker-compose up -d
   ```

## Backup e Restore

### Backup automático:
- O sistema cria backups automáticos durante migrações
- Dados ficam salvos no localStorage como fallback

### Backup manual via Docker:
```bash
# Backup
docker exec meu_app_postgres pg_dump -U admin sativar_isis > backup.sql

# Restore
docker exec -i meu_app_postgres psql -U admin sativar_isis < backup.sql
```

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## Suporte

Para suporte ou dúvidas:
- Verifique os logs no console do navegador
- Acesse o Adminer para verificar o banco de dados
- Entre em contato através dos canais oficiais da SATIVAR