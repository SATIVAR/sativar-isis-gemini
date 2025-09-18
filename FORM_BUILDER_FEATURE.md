# Documento Técnico: Construtor de Formulários

## 1. Visão Geral

O **Construtor de Formulários** é uma feature administrativa avançada no SATIVAR - Seishat que permite a administradores customizar os formulários de cadastro para diferentes tipos de associados (ex: Paciente, Responsável, Tutor). O objetivo é fornecer flexibilidade para que a associação possa coletar informações específicas para cada perfil de maneira estruturada e visual.

A interface é baseada em arrastar e soltar (drag-and-drop), permitindo a montagem de formulários complexos sem a necessidade de escrever código.

---

## 2. Conceitos Principais

-   **Paleta de Campos (Palette):** Uma biblioteca central de todos os campos de formulário disponíveis. Contém campos essenciais (não deletáveis) como "Nome Completo" e "Senha", além de campos customizados que podem ser criados pelo administrador (ex: "Nome do Pet").
-   **Tela de Desenho (Canvas):** A área principal onde o layout do formulário é construído. Os campos da paleta são arrastados para a tela.
-   **Etapas (Steps):** O construtor suporta formulários de múltiplas páginas. Cada página é representada como uma "Etapa" na tela, que pode ser reordenada. Um "Separador de Etapa" pode ser arrastado da paleta para criar novas seções.
-   **Campos (Fields):** Representam os elementos de entrada de dados (ex: texto, email, seleção). Podem ser marcados como obrigatórios.
-   **Propriedades (Properties):** Um painel que aparece ao selecionar um campo na tela, permitindo a configuração de suas regras (ex: validação, obrigatoriedade).

---

## 3. Arquitetura

A feature é implementada com uma arquitetura full-stack, dividida entre o frontend e o backend.

### Frontend

-   **Componente Principal:** `components/settings/FormsPage.tsx`.
-   **Tecnologia:** React com TypeScript.
-   **Drag-and-Drop:** A funcionalidade de arrastar e soltar é implementada com a biblioteca `react-dnd` e `react-dnd-html5-backend`.
-   **Gerenciamento de Estado:** O estado do layout do formulário (etapas e campos) é gerenciado localmente no componente `FormsPage` usando o hook `useState`. Isso garante uma experiência de usuário fluida e reativa durante a edição.

### Backend

-   **Endpoints da API:**
    -   `GET /api/admin/fields`: Retorna a lista completa de campos disponíveis na paleta (da tabela `form_fields`).
    -   `POST /api/admin/fields`: Cria um novo campo customizado na paleta.
    -   `DELETE /api/admin/fields/:id`: Remove um campo customizado da paleta.
    -   `GET /api/admin/layouts/:type`: Retorna a estrutura completa do formulário (etapas e campos) para um tipo de associado específico.
    -   `PUT /api/admin/layouts/:type`: Salva a estrutura completa do formulário para um tipo de associado. Esta rota apaga a configuração antiga e a substitui pela nova, garantindo consistência.

### Banco de Dados (Schema)

A estrutura do formulário é armazenada em três tabelas principais no banco de dados do Seishat:

1.  **`form_fields`**: O catálogo mestre de todos os campos possíveis (a Paleta).
    -   `id`, `field_name`, `label`, `field_type`, `is_base_field`, `is_deletable`, `options`.
2.  **`form_steps`**: Define as etapas (páginas) de um formulário para um tipo de associado.
    -   `id`, `associate_type`, `title`, `step_order`.
3.  **`form_layout_fields`**: Tabela de junção que define quais campos pertencem a qual etapa, sua ordem e se são obrigatórios.
    -   `id`, `step_id`, `field_id`, `display_order`, `is_required`.

---

## 4. Fluxo de Dados

1.  **Carregamento:** Ao acessar a página, o frontend faz duas chamadas à API:
    -   `GET /api/admin/fields` para popular a Paleta.
    -   `GET /api/admin/layouts/:type` (ex: `/api/admin/layouts/paciente`) para carregar a estrutura atual do formulário na Tela.
2.  **Edição:** O administrador manipula o layout arrastando campos da Paleta para a Tela, reordenando campos e etapas, e ajustando propriedades. Todas essas alterações ocorrem no estado local do React.
3.  **Salvamento:** Ao clicar em "Salvar Layout", o frontend envia o objeto de layout completo (um array de etapas, cada uma com um array de campos) via `PUT /api/admin/layouts/:type`.
4.  **Persistência no Backend:** O servidor recebe o novo layout, apaga a configuração antiga para aquele tipo de associado (limpando `form_layout_fields` e `form_steps`) e insere a nova estrutura, garantindo que o formulário salvo seja exatamente o que o administrador configurou.
