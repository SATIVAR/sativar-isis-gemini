# Plano de Ação: Refatoração para Persistência em Banco de Dados MySQL

## 1. Visão Geral e Objetivos

Este documento detalha o plano de refatoração do sistema SATIVAR-ISIS para evoluir de uma arquitetura baseada exclusivamente em `localStorage` para um modelo robusto com um backend que suporta um banco de dados **MySQL**, garantindo uma transição suave e a preservação total dos dados existentes.

**Objetivos Principais:**

1.  **Abstrair a Camada de Persistência:** Desacoplar a lógica da aplicação do método de armazenamento de dados.
2.  **Implementar um Backend Robusto:** Criar um servidor Node.js/Express para gerenciar a lógica de negócios e o acesso ao banco de dados MySQL.
3.  **Garantir a Migração de Dados:** Manter a lógica de fallback para `localStorage` e planejar um mecanismo para migrar dados locais para o banco de dados remoto.

## 2. Análise da Arquitetura Anterior

-   **Modelo:** Aplicação puramente frontend, com toda a lógica de persistência no `localStorage`.
-   **Limitações:** Forte acoplamento com `localStorage`, sem escalabilidade, compartilhamento de dados ou segurança adequada para produção.

## 3. Plano de Implementação Proposto

A refatoração introduzirá uma arquitetura full-stack, com uma clara separação entre o frontend e o backend, e uma camada de acesso a dados focada em MySQL.

### 3.1. Fase 1: Abstração da Camada de Dados (Frontend) - `CONCLUÍDO`

-   **Padrão Repository:** As interações com dados no frontend (`useSettings`, `useReminders`) foram refatoradas para usar Repositórios.
-   **Lógica de Fallback:** Os hooks agora gerenciam um estado online/offline e uma fila de sincronização, permitindo que a aplicação funcione offline usando `localStorage` e sincronize quando o backend estiver disponível.

### 3.2. Fase 2: Implementação do Backend e Banco de Dados - `CONCLUÍDO`

Esta fase foca na construção do servidor e na infraestrutura de banco de dados.

-   **Backend (Node.js/Express):** Um servidor Express fornece uma API RESTful para o frontend. Ele lida com as requisições para `settings` e `reminders`.
-   **Banco de Dados:** O backend agora se conecta exclusivamente a um banco de dados MySQL, ideal para ambientes de produção/hospedados.
-   **Ambiente de Desenvolvimento Simplificado:** O frontend pode ser executado localmente e apontado para um backend em desenvolvimento ou produção, que por sua vez se conecta ao banco de dados MySQL remoto.

### 3.3. Fase 3: Backend Focado em MySQL - `CONCLUÍDO`

O backend foi simplificado para suportar exclusivamente o MySQL.

-   **Módulo de Conexão (`server/db.js`):** Este módulo foi refatorado para:
    -   Utilizar apenas o driver `mysql2`.
    -   Remover a lógica condicional para múltiplos tipos de banco de dados.
    -   Fornecer uma função `query` que traduz os placeholders de consulta (`$1`, `$2` para `?`), permitindo que as rotas permaneçam limpas.
-   **Consultas SQL (`server/routes.js`):** As consultas de escrita foram otimizadas para MySQL, utilizando um fluxo seguro:
    1.  `SELECT` para verificar se o registro existe.
    2.  `UPDATE` se existir, ou `INSERT` se não existir.

### 3.4. Fase 4: Planejar o Serviço de Migração de Dados (Futuro)

Com a base estabelecida, o próximo passo é criar um serviço de migração de dados do `localStorage` para o banco de dados.

**Local Sugerido:** `src/services/database/DataMigrationService.ts`

**Lógica do Serviço:**

1.  **Gatilho:** O serviço será acionado na inicialização da aplicação, quando o modo de banco de dados estiver ativo e online.
2.  **Verificação:**
    -   Verifica se `settings.databaseConfig.type` é `mysql`.
    -   Verifica se a API do backend está acessível.
    -   Verifica se um *flag* `migration_completed` **NÃO** existe no `localStorage`.
    -   Verifica se existem dados no `localStorage` para serem migrados.
3.  **Execução:**
    -   Se as condições forem atendidas, o serviço exibe um modal para o usuário confirmando a migração.
    -   Ao confirmar, o serviço lê todos os dados do `localStorage`.
    -   Envia os dados para um novo endpoint no backend (ex: `POST /api/migrate`).
    -   O backend recebe os dados e os insere/atualiza no banco de dados.
4.  **Finalização:**
    -   Após o sucesso, o backend retorna uma confirmação, e o frontend define o *flag* `migration_completed: true` no `localStorage`.
    -   A aplicação é recarregada, e a partir de então, utilizará exclusivamente o banco de dados como fonte primária.

## 4. Conclusão

Este plano de ação transforma o SATIVAR-ISIS em uma aplicação full-stack moderna, robusta e focada. A arquitetura agora suporta ambientes de produção com um banco de dados MySQL remoto, garante a integridade dos dados com um sistema de fallback e está preparada para uma migração de dados segura e controlada.