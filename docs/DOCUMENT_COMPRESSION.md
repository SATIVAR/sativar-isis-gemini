# Documento Técnico: Otimização de Documentos

## 1. Visão Geral

Este documento detalha a estratégia de otimização de arquivos implementada no sistema SATIVAR, com foco em melhorar a experiência do usuário durante o upload de documentos e garantir a eficiência do armazenamento. A estratégia distingue-se com base no tipo de arquivo: imagens e PDFs.

---

## 2. Compressão de Imagens (Implementado no Navegador)

**Objetivo:** Facilitar o upload de imagens para os usuários, mesmo que eles tenham arquivos de alta resolução que excedam o limite de tamanho definido nas configurações.

### Como Funciona:

-   **Tecnologia:** A funcionalidade é implementada diretamente no navegador (client-side) utilizando a biblioteca `browser-image-compression`. Esta biblioteca é eficiente e usa as APIs nativas do navegador para reprocessar as imagens.
-   **Gatilho:** A compressão é acionada automaticamente se um usuário tentar fazer o upload de um arquivo de imagem (JPG, PNG) que seja maior que o "Tamanho máximo por arquivo (MB)" configurado na página de **Configurações de Documentos**.
-   **Processo:**
    1.  O sistema detecta que o arquivo é uma imagem e que seu tamanho excede o limite.
    2.  A biblioteca de compressão é invocada com o tamanho máximo alvo.
    3.  A imagem é redimensionada e/ou re-codificada para reduzir seu tamanho de arquivo, buscando manter a maior qualidade visual possível.
    4.  O usuário é notificado de que a imagem foi otimizada com sucesso.
    5.  O novo arquivo, menor e otimizado, é o que prossegue no fluxo de upload.
-   **Configurável:** Esta funcionalidade pode ser ativada ou desativada pelo administrador na página "Configurações de Documentos" através da opção "Otimizar imagens automaticamente".

**Vantagens:**
-   **Melhor Experiência do Usuário:** Reduz frustrações com erros de "arquivo muito grande".
-   **Economia de Banda:** Diminui a quantidade de dados transferidos.
-   **Eficiência de Armazenamento:** Garante que os arquivos salvos não sejam desnecessariamente grandes.

---

## 3. Compressão de PDF (Implementado no Servidor)

**Objetivo:** Reduzir o tamanho de armazenamento de arquivos PDF sem comprometer a legibilidade, de forma transparente para o usuário.

### Como Funciona:

-   **Tecnologia:** A compressão de PDFs é realizada no backend (servidor Node.js) e depende da ferramenta de linha de comando **Ghostscript**. Esta é uma abordagem robusta e padrão da indústria para manipulação de PDFs.
-   **Requisito:** **Ghostscript deve estar instalado no ambiente do servidor** para que esta funcionalidade opere. Instruções de instalação estão disponíveis no arquivo `server/readme.md`.
-   **Processo:**
    1.  O usuário faz o upload do arquivo PDF através da interface da aplicação.
    2.  O servidor recebe o arquivo e o salva temporariamente.
    3.  O backend detecta que o arquivo é um PDF e invoca o Ghostscript via um processo filho (`child_process`).
    4.  O Ghostscript reprocessa o PDF usando configurações otimizadas para um bom equilíbrio entre tamanho e qualidade (equivalente à configuração "eBook").
    5.  O novo arquivo PDF, agora comprimido, é salvo no local de armazenamento final. O arquivo temporário original é removido.
-   **Fallback:** Caso o Ghostscript não esteja instalado ou ocorra um erro durante a compressão, o sistema foi projetado para ser resiliente. Ele irá pular a etapa de compressão e salvar o arquivo PDF original, garantindo que nenhum dado seja perdido.

**Vantagens:**
-   **Transparente para o Usuário:** O processo ocorre no servidor, sem impactar o desempenho do navegador do usuário.
-   **Confiabilidade:** Utiliza uma ferramenta testada e robusta (Ghostscript) para evitar a corrupção de arquivos.
-   **Eficiência de Armazenamento:** Reduz significativamente o espaço em disco necessário para armazenar documentos.