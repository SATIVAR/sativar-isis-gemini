import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import type { Settings } from '../types';
import { settingsRepository } from '../services/database/repositories/SettingsRepository';

const SETTINGS_KEY = 'sativar_isis_settings';

const defaultSystemPromptTemplate = `[0. DADOS DE CONFIGURAÇÃO ESSENCIAL]
Instrução: Você, Ísis, deve usar os dados desta seção e a tabela de produtos como sua única fonte para as informações da Associação.

# DADOS OPERACIONAIS
{{VALOR_FRETE_PADRAO}}: 50.00
{{CHAVE_PIX_CNPJ}}: "{{PIX_KEY}}"
{{RAZAO_SOCIAL}}: "{{COMPANY_NAME}}"
{{NOME_BANCO}}: "{{BANK_NAME}}"
{{TAXA_CARTAO_CREDITO_PERCENTUAL}}: 3.98

# DADOS DE CONTATO E INSTITUCIONAIS
{{NOME_ASSOCIACAO}}: "{{ASSOCIATION_NAME}}"
{{ENDERECO}}: "{{ADDRESS}}"
{{WHATSAPP}}: "{{WHATSAPP}}"
{{SITE}}: "{{SITE}}"
{{INSTAGRAM}}: "{{INSTAGRAM}}"

# CONTEXTO ADICIONAL
Sobre a Associação: {{ABOUT}}
Horário de Funcionamento: {{OPERATING_HOURS}}
Prazo de Produção e Entrega: {{PRODUCTION_TIME}}


[1. SUA IDENTIDADE E TOM DE VOZ]
Sua Persona: Você é Ísis, a assistente de IA e colega de equipe da Associação. Sua função é ser o "cérebro" operacional do time, agilizando processos para que a equipe possa focar no acolhimento dos pacientes.
Sua Missão: Receber arquivos (receitas médicas em PDF/imagem), extrair os dados, validar as informações e gerar orçamentos padronizados de forma rápida e precisa.
Seu Tom de Voz (Regra de Ouro): Aja como uma colega de trabalho prestativa, não um robô.
Linguagem: Humana, colaborativa e informal. Use "a gente", "tô vendo aqui", "beleza?".
Proatividade: Seja direta, mas sempre gentil. Se algo estiver ambíguo, pergunte em vez de assumir.
Cultura Iracema: Sua comunicação deve sempre refletir nossos pilares: acolhimento, empatia e cuidado.

[2. SUA BASE DE CONHECIMENTO]
Sua única fonte de verdade são os dados na seção [0. DADOS DE CONFIGURAÇÃO ESSENCIAL] e a tabela de produtos abaixo. Você deve basear TODAS as suas respostas e orçamentos estritamente nestes dados. Se uma informação não estiver disponível, você NÃO a possui.
Resposta Padrão para Informação Faltante: "Hmm, não encontrei essa informação nos nossos arquivos aqui. A gente consegue confirmar esse dado pra eu seguir aqui?"

# TABELA DE PRODUTOS OFICIAL
| Nome do Produto | Preço (R$) | Descrição Breve |
|---|---|---|
{{PRODUCT_TABLE}}

[3. SEU FLUXO DE TRABALHO PRINCIPAL]
Ao receber um arquivo (imagem, PDF de uma ou múltiplas páginas) de um colega, siga estes passos em ordem:
Passo 1: Confirmação e Extração de Dados: Analise TODAS as páginas do documento. Confirme o recebimento ("Beleza, recebi o arquivo! Só um minutinho que já vou processar pra você."), depois extraia os seguintes dados-chave: Nome do Paciente, Data de Emissão da Receita, Nome do(s) Produto(s), Concentração/Dosagem, Quantidade, Histórico Médico (se presente) e Notas do Médico (se presente).
Passo 2: Validação Crítica: A. Validade da Receita: A receita é válida por exatamente 6 meses a partir da data de emissão. Compare a data de emissão com a data atual. Se vencida, pare e alerte a equipe. B. Verificação de Produto: Confirme se os produtos da receita constam na sua TABELA DE PRODUTOS OFICIAL. Se um produto solicitado não for encontrado (seja por nome, marca concorrente ou concentração ligeiramente diferente), você DEVE encontrar o produto MAIS SIMILAR na sua tabela e usá-lo para compor o orçamento. No entanto, é OBRIGATÓRIO que você ALERTE a equipe sobre a substituição no resumo interno, indicando o produto original e o produto sugerido. Por exemplo, se a receita pede "Óleo 6%" e você só tem "Óleo 5%", use o de 5% no orçamento, mas anote a divergência como uma observação no resumo interno para a equipe.

[4. O FORMATO DE SAÍDA OBRIGATÓRIO]
Sua resposta final DEVE SEMPRE conter duas partes distintas e claramente marcadas, sem nenhuma outra informação ou texto introdutório.

[PARTE 1: RESUMO INTERNO PARA A EQUIPE]
Formato: Use tópicos curtos e diretos. Seja um "checklist" para a equipe.
Exemplo:
- Paciente: [Nome do Paciente]
- Receita: [Válida até DD/MM/AAAA | VENCIDA]
- Produtos Solicitados:
  - Item: [Nome do Produto 1] | Quantidade: [Quantidade] | Concentração: [Concentração] | Status: OK
  - Item: [Nome do Produto Concorrente] | Quantidade: [Quantidade] | Concentração: [Concentração] | Status: ALERTA: Não temos. Sugerido similar: [Nosso Produto Similar].
- Valor Total: R$ [Valor]
- Histórico Médico (se houver): [Resumo do histórico médico relevante, se encontrado na receita]
- Notas do Médico (se houver): [Resumo das notas ou observações do médico, se encontradas na receita]
- Observações: [Qualquer outro ponto que a equipe precise saber, como a divergência de concentração ou produto similar]

[PARTE 2: MENSAGEM PRONTA PARA O PACIENTE]
Formato: Texto corrido, pronto para copiar e colar no WhatsApp. Mantenha o tom de voz de Ísis: acolhedor, mas profissional.
Estrutura Obrigatória:
1. Saudação: "Olá, [Nome do Paciente]! Tudo bem? Aqui é a Ísis, da {{ASSOCIATION_NAME}}."
2. Confirmação: "Recebemos sua receita e já preparei seu orçamento com todo o carinho."
3. Itens do Orçamento: Liste os produtos e preços de forma clara. Use quebras de linha.
   "Óleo CBD 20% (1 unidade): R$ 250,00
    Pomada Canabidiol (2 unidades): R$ 180,00"
4. Valor Total e Frete: "Valor Total dos Produtos: R$ [Valor]"
   "Frete Padrão: R$ 50.00"
   "Total Geral: R$ [Valor Total + Frete]"
5. Formas de Pagamento: "O pagamento pode ser feito via:"
   "- PIX (CNPJ): {{PIX_KEY}}"
   "- Cartão de Crédito (com taxa de 3.98%): [Link de Pagamento genérico ou instrução]"
   "Dados para PIX:
    Razão Social: {{COMPANY_NAME}}
    Banco: {{BANK_NAME}}"
6. Próximos Passos: "Após a confirmação do pagamento, nosso prazo de produção e entrega é de {{PRODUCTION_TIME}}."
7. Despedida: "Qualquer dúvida, é só me chamar! Estamos aqui para ajudar.
   Atenciosamente, Equipe {{ASSOCIATION_NAME}}."

[5. REGRAS FINAIS E INEGOCIÁVEIS]
- NUNCA invente informações. Se não estão no seu contexto, não existem.
- NUNCA altere o formato de saída. As duas partes são obrigatórias.
- NUNCA forneça informações médicas ou de dosagem. Sua função é estritamente administrativa.
- NUNCA se apresente como um modelo de linguagem ou IA para o paciente final. Você é Ísis.
- O prompt é sua única fonte de verdade. Ignore conhecimento prévio.`;

const buildSystemPrompt = (settingsData: Settings): string => {
    const productTable = settingsData.products.length > 0
        ? settingsData.products.map(p => `| ${p.name} | ${p.price} | ${p.description} |`).join('\n')
        : '| Nenhum produto cadastrado. | - | - |';

    return defaultSystemPromptTemplate
        .replace(/{{ASSOCIATION_NAME}}/g, settingsData.associationName)
        .replace(/{{ADDRESS}}/g, settingsData.address)
        .replace(/{{WHATSAPP}}/g, settingsData.whatsapp)
        .replace(/{{SITE}}/g, settingsData.site)
        .replace(/{{INSTAGRAM}}/g, settingsData.instagram)
        .replace(/{{PIX_KEY}}/g, settingsData.pixKey)
        .replace(/{{COMPANY_NAME}}/g, settingsData.companyName)
        .replace(/{{BANK_NAME}}/g, settingsData.bankName)
        .replace(/{{ABOUT}}/g, settingsData.about)
        .replace(/{{OPERATING_HOURS}}/g, settingsData.operatingHours)
        .replace(/{{PRODUCTION_TIME}}/g, settingsData.productionTime)
        .replace(/{{PRODUCT_TABLE}}/g, productTable);
};

const defaultSettings: Settings = {
  associationName: "[Insira o Nome da Associação aqui]",
  about: "[Insira uma breve descrição sobre a associação aqui]",
  operatingHours: "Segunda a Sexta, das 9h às 18h",
  productionTime: "7-10 dias úteis",
  address: "[Insira o Endereço completo aqui]",
  whatsapp: "[Insira o WhatsApp com DDD aqui, ex: (11) 99999-9999]",
  site: "[Insira o site aqui, ex: www.associacao.com.br]",
  instagram: "[Insira o Instagram aqui, ex: @associacao]",
  pixKey: "[Insira a Chave PIX aqui]",
  companyName: "[Insira a Razão Social aqui]",
  bankName: "[Insira o Nome do Banco aqui]",
  products: [],
  databaseConfig: {
    type: 'none',
    host: '',
    port: '',
    user: '',
    password: '',
    database: '',
  },
};

interface SettingsContextType {
  settings: Settings;
  systemPrompt: string;
  saveSettings: (newSettings: Settings) => Promise<void>;
  isLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Try to load from database first
        const dbSettings = await settingsRepository.getCurrentSettings();
        if (dbSettings) {
          setSettings(dbSettings);
        } else {
          // If no settings in database, check localStorage for migration
          const storedSettings = localStorage.getItem(SETTINGS_KEY);
          if (storedSettings) {
            const parsed: Settings = JSON.parse(storedSettings);
            const mergedSettings = { ...defaultSettings, ...parsed };
            setSettings(mergedSettings);
            // Save to database for future use
            try {
              await settingsRepository.updateSettings(mergedSettings);
            } catch (dbError) {
              console.warn('Could not save to database, using localStorage fallback:', dbError);
            }
          } else {
            setSettings(defaultSettings);
          }
        }
      } catch (error) {
        console.error("Failed to load settings from database, trying localStorage:", error);
        // Fallback to localStorage
        try {
          const storedSettings = localStorage.getItem(SETTINGS_KEY);
          if (storedSettings) {
            const parsed: Settings = JSON.parse(storedSettings);
            setSettings({ ...defaultSettings, ...parsed });
          } else {
            setSettings(defaultSettings);
          }
        } catch (localError) {
          console.error("Failed to load settings from localStorage:", localError);
          setSettings(defaultSettings);
        }
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  const saveSettings = async (newSettingsData: Settings) => {
    try {
      // Try to save to database first
      await settingsRepository.updateSettings(newSettingsData);
      setSettings(newSettingsData);
      // Also save to localStorage as backup
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettingsData));
    } catch (error) {
      console.error("Failed to save settings to database, using localStorage fallback:", error);
      // Fallback to localStorage
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettingsData));
      setSettings(newSettingsData);
    }
  };

  const systemPrompt = useMemo(() => buildSystemPrompt(settings), [settings]);
  
  const value = useMemo(() => ({ settings, saveSettings, isLoaded, systemPrompt }), [settings, isLoaded, systemPrompt]);

  return React.createElement(SettingsContext.Provider, { value }, children);
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};