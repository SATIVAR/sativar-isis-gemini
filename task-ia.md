# Arquitetura de Persistência Híbrida (LocalStorage -> SQLite)

## Status: Implementado

Este documento descreve a arquitetura de persistência de dados do SATIVAR-ISIS, que foi refatorada para um modelo híbrido e robusto. O objetivo original—permitir que a aplicação funcione "out-of-the-box" e depois seja "promovida" a uma configuração mais robusta—foi alcançado através da seguinte abordagem:

### 1. Visão Geral da Arquitetura

O sistema opera em dois modos principais, com transição transparente para o usuário:

-   **Modo Offline/Local (Padrão):** Se o backend não estiver acessível ou configurado, a aplicação funciona de forma autônoma, utilizando o `localStorage` do navegador para persistir todas as configurações e lembretes. Isso garante que a aplicação seja funcional imediatamente, sem necessidade de configuração inicial do servidor.

-   **Modo Online/API (Recomendado para Produção):** Quando o backend está em execução e o frontend está configurado para se conectar a ele (via variável de ambiente `VITE_API_URL`), a aplicação muda para o modo online. Neste modo, o backend se torna a fonte da verdade, e todos os dados são lidos e escritos em um banco de dados **SQLite** no servidor.

### 2. Componentes da Implementação

#### Backend (Node.js + Express + SQLite)

-   **Banco de Dados Autônomo:** O backend foi migrado de MySQL para **`better-sqlite3`**. Ele agora cria e gerencia automaticamente um arquivo de banco de dados (`server/data/sativar_isis.db`), eliminando a necessidade de qualquer configuração de banco de dados externo.
-   **Migrações Automáticas:** Na inicialização, o servidor verifica e cria as tabelas e índices necessários, garantindo que o esquema do banco de dados esteja sempre correto.
-   **API RESTful:** O servidor expõe endpoints CRUD (`Create`, `Read`, `Update`, `Delete`) para gerenciar `settings` e `reminders` de forma granular.

#### Frontend (React)

-   **Detecção de Conexão:** O `useConnection` hook verifica continuamente a disponibilidade do backend. Se a conexão for perdida, a aplicação entra em modo offline. Se for restaurada, ela volta ao modo online.
-   **Repositórios Abstratos:** A lógica de acesso a dados (`useSettings`, `useReminders`) utiliza o Padrão Repository para interagir com uma `ApiRepository` (quando online) ou uma `LocalStorageRepository` (quando offline).
-   **Fila de Sincronização:** Quando offline, todas as alterações (criação, atualização, exclusão de lembretes) são salvas localmente e adicionadas a uma fila de sincronização no `localStorage`. Ao ficar online, a aplicação processa essa fila, enviando cada operação para a API, garantindo que nenhum dado seja perdido.
-   **UI Simplificada:** A página de "Configurações Avançadas" foi simplificada, removendo a complexa configuração de banco de dados. Agora, ela foca em exibir o status da conexão (Online/Offline) e gerenciar a sincronização, o que é mais intuitivo para o administrador.

### 3. Fluxo de Trabalho do Ponto de Vista do Administrador

1.  **Primeiro Uso (Sem Backend):** O admin abre a aplicação. Como o backend não está em execução, a aplicação funciona em modo `local`. Todas as configurações e lembretes são salvos no `localStorage`. A aplicação é 100% funcional.
2.  **Implantação do Backend:** O admin implanta o servidor backend. Nenhuma configuração de banco de dados é necessária. O servidor cuida de tudo.
3.  **Conectando o Frontend:** O admin configura a variável de ambiente `VITE_API_URL` no ambiente de hospedagem do frontend para apontar para o backend.
4.  **Uso Conectado:** Ao recarregar, a aplicação detecta o backend, entra em modo `api`, e passa a usar o banco de dados SQLite como fonte principal. Se a conexão cair, a aplicação continua funcionando em modo offline e sincronizará as alterações quando a conexão for restabelecida.