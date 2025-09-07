# SATIVAR - ISIS (Intelligent Prescription Processing System)

## Descrição

Esta é a aplicação SATIVAR-ISIS, um sistema inteligente para processamento de receitas médicas. A arquitetura é composta por:

1.  **Frontend**: Uma aplicação React (neste diretório) que fornece a interface do usuário.
2.  **Backend**: Um servidor Node.js/Express (no diretório `/server`) que atua como uma API segura, conectando-se a um banco de dados **MySQL** para persistir os dados.

A aplicação utiliza a API do Google Gemini para extrair informações de prescrições e interage com o backend para salvar e carregar configurações e lembretes.

## Arquitetura e Requisitos

-   **Frontend**: React 19 + TypeScript, Tailwind CSS
-   **Backend**: Node.js + Express
-   **Banco de Dados**: Suporte para **MySQL** (hospedado remotamente)
-   **IA**: API do Google Gemini

## Configuração para Desenvolvimento

Para rodar o projeto, você precisará configurar e executar o frontend e o backend separadamente.

### Etapa 1: Configurar o Backend (`/server`)

O backend é responsável pela conexão segura com seu banco de dados MySQL.

1.  **Navegue até o diretório do servidor:**
    ```bash
    cd server
    ```
2.  **Instale as dependências:**
    ```bash
    npm install
    ```
3.  **Configure as Variáveis de Ambiente:**
    Crie um arquivo `.env` dentro do diretório `/server` e preencha-o com as suas credenciais para a conexão **MySQL remota**:

    ```env
    # CREDENCIAIS DO BANCO MYSQL
    DB_HOST=seu-host-remoto.com
    DB_PORT=3306
    DB_USER=seu_usuario
    DB_PASSWORD=sua_senha
    DB_NAME=seu_banco_de_dados

    # CONFIGURAÇÃO DE SSL (altamente recomendado para conexões remotas)
    DB_SSL=true
    DB_SSL_REJECT_UNAUTHORIZED=true # Mantenha como true a menos que saiba o que está fazendo

    # CHAVE SECRETA DA API (deve ser a mesma no frontend)
    # Gere uma chave longa e aleatória (ex: usando um gerador de senhas)
    API_SECRET_KEY=sua-chave-secreta-muito-longa-e-segura
    ```

4.  **Inicialize o Banco de Dados:**
    Antes de iniciar o servidor, você precisa criar as tabelas `settings` e `reminders`. Fornecemos os comandos SQL necessários no arquivo `server/init-db.md`.

### Etapa 2: Configurar o Frontend (Diretório Raiz)

O frontend interage com o backend e com a API do Gemini.

1.  **Configure as Variáveis de Ambiente (no seu Ambiente de Hospedagem):**
    A aplicação frontend espera que as seguintes variáveis de ambiente sejam injetadas durante o processo de build ou pelo seu serviço de hospedagem (Vercel, Netlify, etc.). **Não as coloque em um arquivo `.env` no código-fonte por segurança.**

    -   `API_KEY`: Sua chave da API do Google Gemini. **Obrigatória para a IA funcionar.**
    -   `API_URL`: A URL onde seu backend está rodando. Para desenvolvimento local, é `http://localhost:3001`. Para produção, será a URL do seu servidor.
    -   `API_SECRET_KEY`: A **mesma** chave secreta que você definiu no `.env` do backend.

2.  **Instale as dependências (se ainda não o fez):**
    ```bash
    npm install
    ```

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

Agora, o frontend irá se comunicar com o seu backend local, que por sua vez se conectará ao seu banco de dados remoto, proporcionando um ambiente de desenvolvimento completo e realista.