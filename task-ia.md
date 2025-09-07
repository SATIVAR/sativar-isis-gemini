# SATIVAR-ISIS - Sistema Inteligente de Processamento de Receitas Médicas

## Visão Geral

O SATIVAR-ISIS é um sistema avançado que utiliza inteligência artificial para processar receitas médicas e gerar orçamentos automatizados. O sistema combina um frontend moderno (React, TypeScript) com um backend flexível em Node.js que oferece persistência de dados em PostgreSQL ou MySQL, além de um modo de fallback para `localStorage`, garantindo uma solução completa e robusta para associações de cannabis medicinal.

## Funcionalidades Principais

### 1. Processamento de Receitas com IA

#### Descrição
O núcleo do sistema é a capacidade de analisar receitas médicas em formatos de imagem ou PDF e extrair informações relevantes utilizando a API do Google Gemini.

#### Componentes Envolvidos
- `QuoteGenerator.tsx` - Interface principal para upload e processamento.
- `geminiService.ts` - Serviço de integração com a API do Google Gemini.
- `Chat.tsx` - Interface de chat para interação com a IA.

### 2. Gerenciamento de Configurações

#### Descrição
Permite que os administradores configurem todos os dados da associação que serão utilizados pela IA para gerar orçamentos padronizados.

#### Componentes Envolvidos
- `SettingsPage.tsx` - Interface de configuração.
- `useSettings.ts` - Hook para gerenciamento de estado das configurações.
- `server/routes.js` - Endpoints da API para salvar e carregar configurações.

#### Funcionalidades
- Cadastro de dados institucionais e financeiros.
- Gestão do catálogo de produtos.
- Configuração do prompt do sistema que orienta a IA.
- Configuração de conexão com banco de dados (PostgreSQL/MySQL).
- Monitoramento do status de preservação de dados.

### 3. Sistema de Lembretes e Tarefas

#### Descrição
Um sistema completo de gerenciamento de lembretes e tarefas com notificações, permitindo que a equipe acompanhe pendências e atividades.

#### Componentes Envolvidos
- `useReminders.ts` - Hook para gerenciamento de estado dos lembretes.
- `Reminders.tsx` - Componentes de UI para listar e criar lembretes.
- `server/routes.js` - Endpoints da API para persistência de lembretes.

### 4. Autenticação Administrativa

#### Descrição
Sistema de login e registro para administradores, garantindo que apenas usuários autorizados possam acessar as configurações sensíveis. As credenciais são salvas localmente no navegador.

#### Componentes Envolvidos
- `AdminLogin.tsx` - Interface de login.
- `AdminRegistration.tsx` - Interface de registro de superadministrador.

### 5. Persistência de Dados Flexível com Fallback

#### Descrição
Arquitetura híbrida que utiliza um backend Node.js para se conectar a um banco de dados (PostgreSQL ou MySQL) como fonte principal, com fallback automático para `localStorage` em caso de falha de conexão com o servidor.

#### Componentes Envolvidos
- `server/index.js` - Servidor backend Express.
- `server/db.js` - Módulo de conexão de banco de dados dinâmico (PG/MySQL).
- `docker-compose.yml` - Orquestração do ambiente de desenvolvimento.
- `useSettings.ts` e `useReminders.ts` - Hooks que gerenciam o estado online/offline e a fila de sincronização.

#### Funcionalidades
- Detecção automática de disponibilidade do backend.
- Alternância transparente entre modo online (banco de dados) e offline (`localStorage`).
- Sincronização automática de dados pendentes quando o backend fica disponível.
- Configuração flexível para diferentes ambientes (desenvolvimento e produção).

## Arquitetura Técnica

### Frontend
- **React 19** com hooks e context API para gerenciamento de estado.
- **TypeScript** para tipagem estática e segurança.
- **Tailwind CSS** para estilização.
- Comunicação com o backend através de uma API RESTful.

### Backend
- **Node.js** com **Express** para a criação da API.
- **Drivers `pg` e `mysql2`** para conectividade com bancos de dados.
- Lógica de negócios centralizada para manipulação de dados.
- Servido via **Docker** para consistência de ambiente.

### Integração com IA
- **Google Gemini API** para processamento de documentos.
- **Prompt engineering** avançado para guiar a IA a fornecer resultados estruturados e consistentes.
- Tratamento de erros robusto para falhas da API.

### Persistência de Dados
- **Fonte Primária:** PostgreSQL ou MySQL, configurado via variáveis de ambiente.
- **Fonte de Fallback:** `localStorage` do navegador.
- Camada de abstração no frontend (hooks) que gerencia onde os dados são lidos e escritos.

## Fluxos de Trabalho Principais

### 1. Processo de Orçamento
1. Administrador configura os dados da associação e produtos via backend.
2. Usuário faz upload de uma receita no frontend.
3. Frontend envia a receita para a API do Google Gemini.
4. IA analisa a receita e retorna informações estruturadas.
5. Frontend processa a resposta, gera o orçamento e o exibe para o usuário.
6. Opcionalmente, um lembrete pode ser criado e salvo no banco de dados através do backend.

### 2. Gestão de Configurações
1. Administrador acessa a página de configurações.
2. Altera os dados e salva.
3. Frontend envia as novas configurações para o endpoint `POST /api/settings`.
4. Backend recebe os dados e os salva no banco de dados configurado (PostgreSQL ou MySQL).

### 3. Operação Offline (Fallback)
1. O frontend falha em se conectar com o backend (endpoint `/health`).
2. A aplicação entra em modo offline.
3. Todas as leituras e escritas de dados são redirecionadas para o `localStorage`.
4. As operações de escrita são adicionadas a uma fila de sincronização.
5. Quando a conexão com o backend é restaurada, a fila é processada e os dados são enviados para o banco de dados.
