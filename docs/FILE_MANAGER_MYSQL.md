# Documento Técnico: Schema do Banco de Dados para o Gerenciador de Arquivos (MySQL)

## 1. Visão Geral

Este documento descreve a arquitetura de banco de dados recomendada para suportar a funcionalidade do Gerenciador de Arquivos no módulo Seishat, utilizando MySQL. O objetivo é criar uma estrutura relacional que armazene de forma segura e eficiente os arquivos e a organização de pastas para cada associado.

A implementação desta estrutura no backend é um pré-requisito para que o Gerenciador de Arquivos seja totalmente funcional, substituindo os dados mockados atualmente no frontend.

---

## 2. Estrutura do Schema

Serão necessárias duas novas tabelas para gerenciar a estrutura de diretórios e os arquivos: `documents_folders` e `documents_files`.

### Tabela: `documents_folders`

Esta tabela armazenará a estrutura de diretórios, incluindo as pastas raiz de cada associado e quaisquer subpastas que venham a ser criadas.

```sql
CREATE TABLE IF NOT EXISTS documents_folders (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `associate_id` INT NOT NULL,
  `parent_folder_id` INT NULL, -- NULL para pastas raiz de associados
  `name` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`associate_id`) REFERENCES `associates`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`parent_folder_id`) REFERENCES `documents_folders`(`id`) ON DELETE CASCADE,
  
  -- Garante que um nome de pasta seja único dentro de sua pasta pai
  UNIQUE KEY `unique_folder_in_parent` (`parent_folder_id`, `name`)
);
```

**Detalhes das Colunas:**
-   `id`: Identificador único da pasta.
-   `associate_id`: Chave estrangeira que vincula a pasta a um associado específico. A cláusula `ON DELETE CASCADE` garante que todas as pastas de um associado sejam removidas se o associado for excluído.
-   `parent_folder_id`: Chave estrangeira auto-referenciada para criar a hierarquia de pastas. Uma pasta com `parent_folder_id` igual a `NULL` é uma pasta raiz.
-   `name`: O nome da pasta exibido na interface (ex: "Receitas", "Documentos Pessoais").
-   `unique_folder_in_parent`: Uma restrição que impede a criação de duas pastas com o mesmo nome dentro do mesmo diretório.

### Tabela: `documents_files`

Esta tabela armazenará os metadados de cada arquivo enviado por um associado. O arquivo físico será armazenado em um sistema de arquivos no servidor ou em um serviço de armazenamento de objetos (como S3), e a tabela conterá a referência para ele.

```sql
CREATE TABLE IF NOT EXISTS documents_files (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `folder_id` INT NOT NULL,
  `associate_id` INT NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `stored_name` VARCHAR(255) NOT NULL UNIQUE, -- Nome seguro no disco (ex: UUID.pdf)
  `mime_type` VARCHAR(100) NOT NULL,
  `size_bytes` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`folder_id`) REFERENCES `documents_folders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`associate_id`) REFERENCES `associates`(`id`) ON DELETE CASCADE,

  -- Garante que um nome de arquivo seja único dentro de sua pasta
  UNIQUE KEY `unique_file_in_folder` (`folder_id`, `original_name`)
);
```

**Detalhes das Colunas:**
-   `id`: Identificador único do arquivo.
-   `folder_id`: Chave estrangeira que indica em qual pasta o arquivo está localizado.
-   `associate_id`: Chave estrangeira para associar o arquivo diretamente ao associado (útil para consultas e regras de permissão).
-   `original_name`: O nome do arquivo como foi enviado pelo usuário (ex: `receita_dr_joao.pdf`).
-   `stored_name`: O nome real do arquivo no sistema de armazenamento. Recomenda-se usar um identificador único (como um UUID) para evitar conflitos de nome e problemas de segurança.
-   `mime_type`: O tipo MIME do arquivo (ex: `application/pdf`, `image/jpeg`).
-   `size_bytes`: O tamanho do arquivo em bytes.

---

## 3. Fluxo de Operação (Backend)

1.  **Criação de Associado:** Ao criar um novo associado, o backend deve também criar uma pasta raiz para ele na tabela `documents_folders`, com `parent_folder_id` definido como `NULL`. O nome pode ser um padrão como `#ID_NOME`.
2.  **Upload de Arquivo:**
    -   O backend recebe o arquivo.
    -   Gera um nome seguro para armazenamento (`stored_name`).
    -   Salva o arquivo físico no local de armazenamento.
    -   Cria uma nova entrada na tabela `documents_files` com todos os metadados relevantes.
3.  **Navegação:**
    -   Para listar o conteúdo de uma pasta, a API consultará `documents_folders` e `documents_files` onde `parent_folder_id` ou `folder_id` correspondem ao ID da pasta atual.
4.  **Exclusão:**
    -   A exclusão de um arquivo removerá a entrada da tabela `documents_files` e o arquivo físico do armazenamento.
    -   A exclusão de uma pasta removerá a entrada da `documents_folders`. A cláusula `ON DELETE CASCADE` garantirá que todas as subpastas e arquivos contidos nela sejam removidos automaticamente do banco de dados. O backend deve complementar essa lógica excluindo os arquivos físicos correspondentes.