# SATIVAR - ISIS (Intelligent Prescription Processing System)

## Descrição

Esta é a aplicação SATIVAR-ISIS, um sistema inteligente para processamento de receitas médicas. A arquitetura é composta por:

1.  **Frontend**: Uma aplicação React (neste diretório) que fornece a interface do usuário.
2.  **Backend**: Um servidor Node.js/Express (no diretório `/server`) que atua como uma API segura, utilizando um banco de dados **SQLite** para persistir todos os dados da aplicação, incluindo configurações, lembretes e produtos.

A aplicação utiliza a API do Google Gemini para extrair informações de prescrições e interage com o backend para todas as operações de dados.

## Arquitetura e Requisitos

-   **Frontend**: React 19 + TypeScript, Tailwind CSS
-   **Backend**: Node.js + Express
-   **Banco de Dados**: **SQLite** (gerenciado automaticamente pelo backend)
-   **IA**: API do Google Gemini

## Configuração para Desenvolvimento

Para rodar o projeto localmente, você precisará configurar e executar o frontend e o backend separadamente. A configuração do banco de dados é automática.

### Etapa 1: Configurar o Backend (`/server`)

O backend é autônomo e criará seus próprios arquivos de banco de dados SQLite.

1.  **Navegue até o diretório do servidor:**
    ```bash
    cd server
    ```
2.  **Instale as dependências:**
    ```bash
    npm install
    ```
3.  **Configure as Variáveis de Ambiente:**
    -   Crie um arquivo `.env` dentro do diretório `/server`.
    -   Copie o conteúdo do arquivo `server/.env.example` para o seu novo `server/.env`.
    -   Preencha o arquivo `server/.env` com uma chave secreta para a API.

    **`server/.env` (Exemplo):**
    ```env
    # Porta do servidor (opcional, padrão 3001)
    PORT=3001

    # Chave secreta para a API (deve ser a mesma no frontend)
    # Gere uma chave longa e aleatória (ex: usando um gerador de senhas)
    API_SECRET_KEY=sua-chave-secreta-muito-longa-e-segura
    ```

4.  **Inicialize o Banco de Dados:**
    Não há etapa manual! Ao iniciar, o servidor criará automaticamente os arquivos de banco de dados necessários (ex: `server/data/sativar_isis.db`) e as tabelas.

### Etapa 2: Configurar o Frontend (Diretório Raiz)

O frontend interage com o backend e com a API do Gemini.

1.  **Volte para o diretório raiz:**
    ```bash
    cd ..
    ```
2.  **Instale as dependências (se ainda não o fez):**
    ```bash
    npm install
    ```
3.  **Configure as Variáveis de Ambiente:**
    -   Crie um arquivo `.env` no diretório raiz do projeto (ao lado deste `readme.md`).
    -   Copie o conteúdo do arquivo `.env.example` para o seu novo `.env`.
    -   Preencha o arquivo com a URL do seu backend, a chave da API (a mesma do backend) e sua chave do Gemini.

    **`.env` (Exemplo):**
    ```env
    # URL para o servidor backend rodando localmente
    VITE_API_BASE_URL=http://localhost:3001

    # Esta chave DEVE ser a mesma definida em /server/.env
    VITE_API_SECRET_KEY=sua-chave-secreta-muito-longa-e-segura

    # Sua chave da API do Google Gemini (obrigatória para a IA funcionar)
    VITE_GEMINI_API_KEY=sua-chave-do-gemini-aqui
    ```
    
    > **Importante:** Para **produção**, estas variáveis devem ser configuradas no painel de controle do seu serviço de hospedagem (Vercel, Netlify, etc.), **não** em um arquivo `.env` no código-fonte.

### Etapa 3: Executar a Aplicação

Para desenvolver localmente, você precisa de dois terminais abertos.

1.  **Terminal 1: Inicie o Backend**
    ```bash
    cd server
    npm run dev
    ```
    O servidor será iniciado, geralmente na porta `3001`.

2.  **Terminal 2: Inicie o Frontend**
    ```bash
    # No diretório raiz do projeto
    npm run dev
    ```
    A aplicação React será iniciada, geralmente na porta `5173`. Acesse `http://localhost:5173` no seu navegador.

Agora, o frontend irá se comunicar com o seu backend local, que por sua vez usará seu próprio banco de dados SQLite, proporcionando um ambiente de desenvolvimento completo e autônomo.
