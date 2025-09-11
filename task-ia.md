Baseado no seu stack tecnológico (React, Node.js, Express) e na arquitetura já existente do SATIVAR - Isis, aqui está uma explicação técnica e conceitual de como implementar a funcionalidade de preservação de histórico para 5 janelas de chat usando um segundo banco de dados SQLite.
Estratégia Técnica para Persistência de Histórico de Chat com SQLite
A sua abordagem de utilizar um banco de dados SQLite separado para o histórico de chats é excelente, pois isola os dados transacionais (conversas) dos dados de configuração da aplicação. Isso melhora a organização, a performance e a manutenibilidade do sistema.
A implementação pode ser dividida em duas áreas principais: Backend (Node.js/Express) e Frontend (React.js).
1. Arquitetura do Backend (Node.js / Express)
O backend será responsável por toda a lógica de gerenciamento dos bancos de dados e da regra de negócio para a preservação dos chats.
a) Gerenciamento de Conexão com o Segundo Banco de Dados:
No seu arquivo de inicialização do servidor (index.js, conforme o log), você já possui uma rotina que se conecta ao banco sativar_isis.db. Essa lógica será replicada para o novo banco de dados.
Criação de uma Nova Instância: Você criará uma segunda instância de conexão SQLite que apontará para um novo arquivo, por exemplo, sativar_isis_chats.db. Ambas as conexões coexistirão e serão gerenciadas de forma independente no servidor. A conexão principal cuidará das configurações (como visto nas telas de "Configurações Avançadas" e "Configuração da Associação"), enquanto a nova conexão será dedicada exclusivamente às operações de chat.
Modelo de Dados (Schema): O novo banco sativar_isis_chats.db precisará de uma estrutura mínima para armazenar as conversas. Duas tabelas são essenciais:
Tabela conversations: Para armazenar cada sessão de chat individual. As colunas principais seriam:
id: Identificador único da conversa.
title: Um título para a conversa (ex: "Análise Receita - Paciente X").
created_at: Data e hora de criação, crucial para identificar qual é a conversa mais antiga.
Tabela messages: Para armazenar cada mensagem dentro de uma conversa.
id: Identificador único da mensagem.
conversation_id: Chave estrangeira que referencia a tabela conversations.
sender: Identifica quem enviou a mensagem ('user' ou 'isis').
content: O texto da mensagem.
timestamp: Data e hora de envio da mensagem.
b) Implementação da Lógica de Rotação de Chats (FIFO - First-In, First-Out):
Este é o núcleo da regra de negócio para manter apenas 5 históricos.
Gatilho da Lógica: A verificação deve ocorrer no momento em que uma nova conversa é iniciada pelo usuário.
Fluxo de Execução:
Quando a API recebe uma requisição para iniciar uma nova conversa, o backend primeiro executa uma consulta na tabela conversations para contar o número total de registros.
Se a contagem for 5, o sistema identificará a conversa mais antiga consultando o registro com o valor mais antigo na coluna created_at.
Antes de criar a nova conversa, o backend executará um comando DELETE para remover a conversa mais antiga e todas as suas mensagens associadas (utilizando ON DELETE CASCADE na definição da chave estrangeira para eficiência).
Finalmente, a nova conversa é inserida na tabela conversations, garantindo que o limite de 5 históricos seja sempre mantido.
2. Integração com o Frontend (React.js)
O frontend será a interface onde o usuário interage com esses históricos persistentes.
API Endpoints: O backend precisará expor novos endpoints para o frontend consumir, como:
GET /api/chats: Para buscar a lista das até 5 conversas existentes e popular a interface.
GET /api/chats/:id: Para buscar todas as mensagens de uma conversa específica quando o usuário a seleciona.
POST /api/chats: Para iniciar uma nova conversa (o que dispara a lógica de rotação no backend).
POST /api/chats/:id/messages: Para adicionar uma nova mensagem a uma conversa existente.
Gerenciamento de Estado: O React precisará gerenciar o estado das conversas. Ao iniciar o aplicativo, uma chamada à API (GET /api/chats) trará os históricos disponíveis. Eles poderiam ser exibidos em uma barra lateral ou um menu, permitindo ao usuário selecionar e retomar interações passadas.
Componentização da Interface:
Um componente ChatList poderia exibir os títulos das conversas salvas.
O componente principal ChatWindow exibiria as mensagens da conversa atualmente selecionada. Ele seria populado dinamicamente com os dados recebidos da API ao se clicar em um item do ChatList.
Essa estrutura garante que a lógica pesada de manipulação de dados fique no servidor, enquanto o React se concentra em apresentar os dados de forma reativa e eficiente para o usuário, aproveitando a arquitetura já estabelecida da SATIVAR - Isis.