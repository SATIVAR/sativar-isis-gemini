Plano de Ação para Implementação do Histórico de Chat
[x] Fase 1: Estrutura do Backend e Banco de Dados (Node.js/Express + SQLite)
Nesta fase, prepararemos toda a infraestrutura no servidor para suportar o armazenamento e gerenciamento das conversas.
Criação do Novo Banco de Dados:
Iremos configurar um novo módulo de gerenciamento de banco de dados (server/chatDb.js) para a conexão com o arquivo sativar_isis_chats.db, isolando-o da lógica principal.
Atualizaremos o script de migração (server/migration.js) para incluir a criação automática das duas novas tabelas: conversations (com colunas id, title, created_at) e messages (com id, conversation_id, sender, content, timestamp). A chave estrangeira em messages terá a cláusula ON DELETE CASCADE para garantir a integridade dos dados ao apagar uma conversa.
Implementação dos Endpoints da API:
No arquivo server/routes.js, adicionaremos as novas rotas protegidas pela API key:
GET /api/chats: Retorna as 5 conversas mais recentes.
GET /api/chats/:id: Retorna todas as mensagens de uma conversa específica.
POST /api/chats/:id/messages: Adiciona uma nova mensagem a uma conversa existente.
POST /api/chats: Endpoint para iniciar uma nova conversa, contendo a lógica FIFO:
Contar o número de conversas existentes.
Se o número for >= 5, identificar e deletar a conversa mais antiga (com base em created_at).
Inserir a nova conversa com um título padrão (ex: "Nova Análise - HH:mm").
Retornar o ID da nova conversa para o frontend.
[x] Fase 2: Integração de Dados e Gerenciamento de Estado no Frontend (React)
Com o backend pronto, conectaremos o frontend para consumir e gerenciar os dados das conversas.
Novo Hook para Gerenciamento de Conversas:
Criaremos um novo hook useChatHistory.ts que será o "cérebro" da funcionalidade no frontend. Ele irá gerenciar:
A lista de conversas disponíveis.
A conversa ativa no momento.
As mensagens da conversa ativa.
Este hook fornecerá funções como loadConversations, selectConversation, startNewConversation e sendMessage.
Adaptação do Componente Principal:
O componente QuoteGenerator.tsx será refatorado. Em vez de usar useState para gerenciar as mensagens, ele passará a consumir o estado e as funções do novo hook useChatHistory. Isso centraliza a lógica e mantém os componentes limpos.
[x] Fase 3: Implementação da Interface do Usuário (UI/UX)
Nesta fase, construiremos os elementos visuais para que o usuário possa interagir com o histórico.
Criação do Painel de Histórico:
Desenvolveremos um novo componente ChatHistorySidebar.tsx.
Este painel será integrado à tela principal de chat, posicionado à esquerda, oferecendo uma navegação fluida e intuitiva.
Funcionalidades:
Um botão proeminente de + Nova Análise no topo.
Uma lista rolável com os títulos das 5 conversas salvas, da mais recente para a mais antiga.
Indicação visual clara de qual conversa está ativa.
Ao clicar em uma conversa, o painel principal de chat será atualizado instantaneamente com o histórico correspondente.
Ajustes na Experiência de Uso:
O fluxo do usuário será natural: a aplicação sempre abrirá na conversa mais recente ou em uma nova. O usuário poderá alternar entre conversas antigas a qualquer momento pelo novo painel.
O botão "Analisar Nova Receita" que existe hoje será substituído pelo botão "+ Nova Análise" no painel de histórico para unificar a experiência.
[x] Fase 4: Refinamentos e Testes Finais
A fase final é dedicada a polir a funcionalidade e garantir sua estabilidade.
Títulos Dinâmicos: Como um refinamento, após os primeiros envios, poderemos fazer uma chamada à Gemini para gerar um título inteligente e sucinto para a conversa (ex: "Orçamento - João Silva - CBD 10%"), melhorando a organização.
Tratamento de Estados: Garantir que a interface se comporte bem em todos os cenários: carregamento inicial, lista de chats vazia, troca rápida entre conversas.
Testes End-to-End: Validar todo o fluxo: criar uma conversa que expulsa a mais antiga, carregar uma conversa antiga, enviar novas mensagens e verificar a persistência no banco de dados.