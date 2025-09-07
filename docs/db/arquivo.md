# Documento Técnico: Refatoração da Arquitetura de Persistência de Dados

## 1. Visão Geral

Este documento detalha as mudanças arquiteturais implementadas para evoluir o sistema SATIVAR-ISIS de um modelo puramente `localStorage` para uma arquitetura full-stack robusta, segura e escalável, com um backend Node.js e um banco de dados relacional **MySQL**.

**Objetivos Alcançados:**
1.  **Segurança Reforçada:** Eliminação de vulnerabilidades críticas na API.
2.  **Escalabilidade e Integridade de Dados:** Migração de um modelo de "blob JSON" para um esquema relacional normalizado em MySQL.
3.  **Sincronização Offline Robusta:** Substituição da lógica de "último a salvar vence" por uma fila de operações individuais.
4.  **Simplificação da Arquitetura:** Foco exclusivo no MySQL, removendo a complexidade de suportar múltiplos SGBDs.

---

## 2. Ações Implementadas

### Fase 1: Correção de Segurança no Backend

-   **Arquivo Modificado:** `server/index.js`
-   **Problema:** O middleware de autenticação (`apiKeyAuth`) permitia o acesso à API se a variável de ambiente `API_SECRET_KEY` não estivesse definida, uma falha de segurança crítica conhecida como "falhar aberto".
-   **Solução:** A lógica foi invertida. Agora, se `API_SECRET_KEY` não estiver configurada no servidor, o acesso à API é **bloqueado** com um erro `503 Service Unavailable`. Isso garante que a API nunca seja exposta acidentalmente em um ambiente de produção mal configurado. O acesso só é permitido se a chave existir no servidor e for fornecida corretamente pelo cliente.

### Fase 2: Redesenho do Esquema do Banco de Dados

-   **Arquivo Modificado:** `server/init-db.md`
-   **Problema:** Os lembretes eram armazenados como um único array JSON em uma única linha da tabela. Este modelo não é escalável, impede consultas eficientes e é altamente suscetível a condições de corrida (*race conditions*), onde atualizações simultâneas poderiam causar perda de dados.
-   **Solução:** A tabela `reminders` foi reestruturada para um esquema relacional em MySQL. Cada linha agora representa um único lembrete, com colunas para cada campo (`id`, `patientName`, `dueDate`, etc.). Isso permite:
    -   **Escalabilidade:** Manipular um grande volume de lembretes de forma eficiente.
    -   **Performance:** Realizar consultas SQL otimizadas no banco de dados.
    -   **Integridade:** Eliminar o risco de perda de dados por sobrescrita.

### Fase 3: Adaptação da API e do Frontend

#### Backend: API CRUD

-   **Arquivo Modificado:** `server/routes.js`
-   **Implementação:** As rotas `/api/reminders` foram completamente reescritas para abandonar o modelo de "blob" e implementar um padrão RESTful com operações **CRUD (Create, Read, Update, Delete)**:
    -   `GET /api/reminders`: Lista todos os lembretes.
    -   `POST /api/reminders`: Cria um novo lembrete.
    -   `PUT /api/reminders/:id`: Atualiza um lembrete específico.
    -   `DELETE /api/reminders/:id`: Exclui um lembrete específico.

#### Frontend: Sincronização Inteligente Offline

-   **Arquivos Modificados:** `hooks/useReminders.ts`, `services/database/*`
-   **Problema:** A lógica de sincronização anterior enviava todo o array de lembretes do `localStorage` para o servidor, o que é incompatível com a nova API CRUD e perpetuaria o problema de perda de dados.
-   **Solução:** Foi implementada uma **fila de sincronização offline**:
    1.  **Armazenamento de Ações:** Quando o aplicativo está offline, cada ação do usuário (criar, atualizar ou deletar um lembrete) é salva localmente de forma otimista para uma resposta de UI imediata, e a ação específica (ex: `{ type: 'add', payload: newReminder }`) é adicionada a uma fila no `localStorage` (`sativar_isis_reminders_sync_queue`).
    2.  **Processamento da Fila:** Quando a conexão com o servidor é restaurada, a função `processSync` é acionada. Ela itera sobre cada ação na fila e executa a chamada de API CRUD correspondente (`POST`, `PUT`, `DELETE`).
    3.  **Reconciliação:** Após processar a fila com sucesso, a aplicação busca o estado completo e atualizado do banco de dados para garantir consistência total e atualiza o cache local.

---

## 3. Ações Futuras e Pontos de Melhoria

-   **Tratamento de Erros na Sincronização:** A implementação atual assume que todas as ações na fila serão executadas com sucesso. Uma melhoria futura seria adicionar um tratamento para falhas individuais (ex: tentar atualizar um lembrete que foi deletado por outro usuário), mantendo a ação falha na fila para uma nova tentativa ou notificando o usuário.
-   **Sincronização das Configurações:** As configurações (`settings`) ainda utilizam o padrão "salvar tudo". Embora menos crítico devido à baixa frequência de alterações, essa lógica poderia ser refatorada para o mesmo padrão de fila de sincronização, se necessário.
-   **Migração de Dados Iniciais:** O sistema não possui um fluxo para migrar dados de uma versão antiga (baseada apenas em `localStorage`) para o banco de dados. Para usuários existentes, um serviço de migração único seria necessário.