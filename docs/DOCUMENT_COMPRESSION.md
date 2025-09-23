# Documento Técnico: Otimização de Documentos

## 1. Visão Geral

Este documento detalha a estratégia de otimização de arquivos implementada no sistema SATIVAR, com foco em melhorar a experiência do usuário durante o upload de documentos e garantir a eficiência do armazenamento. A estratégia distingue-se com base no tipo de arquivo: imagens e PDFs.

---

## 2. Compressão de Imagens (Implementado)

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

## 3. Compressão de PDF (Não Implementado no Navegador)

**Desafio Técnico:** Ao contrário das imagens, os arquivos PDF têm uma estrutura complexa que pode incluir texto vetorial, fontes embutidas, múltiplas imagens com diferentes compressões e metadados. A compressão de PDFs é um processo computacionalmente intensivo e delicado.

**Por que não foi implementado no navegador?**
-   **Risco de Corrupção:** Bibliotecas de manipulação de PDF no navegador podem, em casos complexos, falhar e corromper o arquivo, tornando-o ilegível.
-   **Perda de Qualidade:** A compressão poderia degradar a qualidade de forma inaceitável, especialmente em documentos escaneados, tornando o texto ou assinaturas ilegíveis, o que é um risco para documentos legais como receitas e termos.
-   **Desempenho:** O processo pode ser muito lento no navegador do usuário, especialmente em dispositivos menos potentes, travando a interface e causando uma má experiência.
-   **Falta de Ferramentas Robustas:** Não existem bibliotecas para o navegador que se comparem em robustez e confiabilidade a ferramentas de servidor como o **Ghostscript**.

### Estratégia Recomendada para PDFs

1.  **Validação no Navegador (Implementado):** O sistema continuará a validar o tamanho do arquivo PDF no navegador. Se o arquivo exceder o limite, o usuário receberá uma mensagem de erro clara, instruindo-o a comprimir o arquivo manualmente antes de tentar novamente. Esta é a abordagem mais segura para garantir a integridade dos documentos.

2.  **Compressão no Servidor (Próximos Passos - Futuro):** A abordagem padrão da indústria e a mais recomendada é implementar a compressão de PDFs no backend.
    -   **Fluxo Proposto:**
        1.  O usuário faz o upload do PDF original para o servidor (com um limite de tamanho generoso, ex: 25MB).
        2.  O servidor recebe o arquivo e o coloca em uma fila de processamento.
        3.  Um processo em segundo plano (worker) usa uma ferramenta robusta como o **Ghostscript** (uma suíte de software de código aberto para processamento de PostScript e PDF) para otimizar o PDF.
        4.  O arquivo otimizado substitui o original no armazenamento final.
    -   **Vantagens:** Este método é confiável, não afeta a experiência do usuário (o processamento é assíncrono) e produz resultados de alta qualidade.
    -   **Requisitos:** Esta implementação exigiria modificações no ambiente do servidor para instalar o Ghostscript ou integrar um serviço de API de terceiros para compressão de PDFs.