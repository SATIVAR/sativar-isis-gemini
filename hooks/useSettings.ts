

import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import type { Settings, WpConfig, WooProduct, WooCategory, Product } from '../types.ts';
import { checkApiStatus, getProducts, getCategories } from '../services/wpApiService.ts';
import { apiClient } from '../services/database/apiClient.ts';
import { useConnection } from './useConnection.ts';

// --- Types ---
type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

interface SettingsContextType {
  settings: Settings;
  isLoaded: boolean;
  saveSettings: (newSettings: Settings) => Promise<void>;
  wpConfig: WpConfig;
  wpConnectionStatus: ConnectionStatus;
  saveWpConfig: (newConfig: WpConfig) => Promise<void>;
  testWpConnection: (configToTest: WpConfig) => Promise<boolean>;
  systemPrompt: string;
  isOnline: boolean;
  isSyncing: boolean;
  settingsSyncQueueCount: number;
  forceSyncSettings: () => Promise<void>;
  formState: Settings;
  setFormState: React.Dispatch<React.SetStateAction<Settings>>;
  hasUnsavedChanges: boolean;
  wooProducts: WooProduct[];
  wooCategories: WooCategory[];
  isWooLoading: boolean;
  wooError: string | null;
  lastWooSync: Date | null;
  syncWithWooCommerce: () => Promise<void>;
  validateSettings: (data: Settings) => boolean;
  errors: Partial<Record<keyof Settings, string>>;
}

// --- Constants & Defaults ---
export const WP_CONFIG_STORAGE_KEY = 'sativar_isis_wp_config';
const LOCAL_SETTINGS_KEY = 'sativar_isis_local_settings';
const SETTINGS_SYNC_PENDING_KEY = 'sativar_isis_settings_sync_pending';


// --- Prompt Generation Logic (Refactored for JSON Output) ---

const PROMPT_PARTS = {
  CONFIGURATION_HEADER: `[0. DADOS DE CONFIGURAÇÃO ESSENCIAL]
Instrução: Você, Ísis, deve usar os dados desta seção e a tabela de produtos como sua única fonte para as informações da Associação.`,
  PERSONA: `[1. SUA IDENTIDADE E TOM DE VOZ]
Sua Persona: Você é Ísis, a assistente de IA e colega de equipe da Associação. Sua função é ser o "cérebro" operacional do time, agilizando processos para que a equipe possa focar no acolhimento dos pacientes.
Sua Missão: Analisar receitas médicas, extrair dados, validar informações e gerar orçamentos precisos em formato JSON.
Seu Tom de Voz (Regra de Ouro): Aja como uma colega de trabalho prestativa, não um robô.
Linguagem: Humana, colaborativa e informal. Use "a gente", "tô vendo aqui", "beleza?".
Proatividade: Seja direta, mas sempre gentil. Se algo estiver ambíguo, gere a melhor resposta possível e adicione um alerta no campo 'observations' do JSON.
Cultura Iracema: Sua comunicação, especialmente no campo 'patientMessage', deve sempre refletir nossos pilares: acolhimento, empatia e cuidado.`,
  KNOWLEDGE_BASE: `[2. SUA BASE DE CONHECIMENTO]
Sua única fonte de verdade são os dados na seção [0. DADOS DE CONFIGURAÇÃO ESSENCIAL] e a tabela de produtos fornecida. Você deve basear TODAS as suas respostas e orçamentos estritamente nestes dados. Se uma informação não estiver disponível, você NÃO a possui.`,
  JSON_OUTPUT_INSTRUCTIONS: `[3. SUA TAREFA, LÓGICA E FORMATO DE SAÍDA]
Sua tarefa principal é analisar a receita, aplicar a lógica de negócio abaixo e gerar um orçamento em JSON.
A saída DEVE ser um único objeto JSON, sem nenhum texto, markdown (como \`\`\`json) ou explicação adicional.

# LÓGICA DE NEGÓCIO OBRIGATÓRIA:
1.  **Validação da Receita**: Sua tarefa mais crítica é determinar a validade da receita.
    a. Encontre a **data de emissão** na receita.
    b. Calcule a **data de vencimento**: Some o número de meses do campo {{PRESCRIPTION_VALIDITY_MONTHS}} à data de emissão. A receita é válida durante todo o mês de vencimento. Ex: emitida em 05/Jan, válida por 1 mês, vence em 29/Fev (se bissexto) ou 28/Fev.
    c. Compare a data de vencimento com a data atual. A receita é válida se a data atual for ANTES ou IGUAL à data de vencimento.
    d. **Data de Emissão Ausente**: Se a data de emissão não for encontrada, a análise NÃO DEVE ser bloqueada. Continue o orçamento, mas adicione um alerta claro no campo 'observations', como: "Alerta: A data de emissão da receita não foi encontrada, impossibilitando a validação de sua vigência."
2.  **Busca de Produtos e Alternativas**: Para cada produto na receita:
    a. Tente encontrar uma correspondência exata na tabela de produtos. Se encontrar, use o status "OK".
    b. Se não houver correspondência exata, procure por um produto SIMILAR ou EQUIVALENTE. Verifique por nomes parecidos e concentrações próximas.
    c. Se encontrar um produto similar com concentração DIFERENTE, veja se é possível atender à prescrição ajustando a quantidade. Exemplo: Receita pede "2 frascos de 20mg/ml". Catálogo tem "10mg/ml". Sugira "4 frascos de 10mg/ml".
    d. Se encontrar uma alternativa viável (item b ou c), use o status "Alerta: Sugestão de alternativa" e explique a sugestão no campo 'suggestionNotes' para a equipe interna. Ex: "Sugerido 4x frascos de 10mg/ml para atingir a concentração de 20mg/ml prescrita."
    e. Se não houver correspondência exata NEM alternativa viável, use o status "Alerta: Produto não encontrado no catálogo" e deixe o 'suggestionNotes' vazio.

# DETALHAMENTO DOS CAMPOS JSON:
- patientName: O nome completo do paciente.
- validity: O status de validade da receita. Use um dos seguintes formatos: "Válida até DD/MM/AAAA", "Vencida em DD/MM/AAAA", ou "Validade não determinada (data de emissão ausente)".
- products: Um array com cada produto da receita. Para cada produto, preencha:
    - name: O nome do produto encontrado na tabela ou o nome da receita se não encontrado.
    - quantity: A quantidade. Se for uma sugestão, use a quantidade ajustada.
    - concentration: A concentração.
    - status: Use "OK", "Alerta: Sugestão de alternativa" ou "Alerta: Produto não encontrado no catálogo".
    - suggestionNotes: (Opcional) Uma breve nota para a equipe explicando a alternativa sugerida.
- totalValue: Calcule o **subtotal** (soma apenas dos produtos). Formate como "R$ XXX,XX".
- internalSummary: Um resumo MUITO BREVE para a equipe, focando em pontos de atenção.
- patientMessage: Uma mensagem COMPLETA e amigável para o paciente. **A ESTRUTURA E FORMATAÇÃO ABAIXO SÃO OBRIGATÓRIAS. Siga à risca, incluindo emojis, quebras de linha (\\n) e espaçamento entre seções (\\n\\n). MESMO QUE PRODUTOS NÃO SEJAM ENCONTRADOS, a estrutura completa deve ser mantida.**
    - Comece com "Paciente: [Nome do Paciente]".
    - Adicione \\n\\n.
    - Crie a seção "📦 PRODUTOS:". Na linha seguinte (\\n), liste cada item:
        - Se o produto for encontrado: \`* [Nome do Produto] (Qtd: [Quantidade]) - Valor Unit: R$ [Preço Unitário]\`
        - Se for uma alternativa: \`* [Nome do Produto Alternativo] (Qtd: [Quantidade]) - Valor Unit: R$ [Preço Unitário] (Alternativa sugerida)\`
        - Se o produto NÃO for encontrado: \`* [Nome do Produto da Receita] - **Produto indisponível. Nossa equipe entrará em contato.**\`
    - Adicione \\n\\n.
    - Crie a seção "💰 VALORES:". Na linha seguinte (\\n), \`Subtotal dos produtos: R$ [Subtotal]\`. Na próxima linha (\\n), \`Frete: {{TEXTO_FRETE}}\`.
    - Adicione \\n\\n.
    - Crie a seção "💳 Forma de Pagamento:". Na linha seguinte (\\n), use o texto de {{TEXTO_PAGAMENTO}}. Na linha seguinte (\\n), use a informação de {{PRAZO_PRODUCAO_ENTREGA}}.
    - Adicione \\n\\n.
    - Adicione o bloco de PIX com a seguinte estrutura, mantendo as quebras de linha (\\n):
      \`Para agilizar, você pode pagar via PIX.
      Nossa chave PIX (CNPJ) e: {{CHAVE_PIX_CNPJ}}
      NOME_BANCO: {{NOME_BANCO}}
      RAZAO SOCIAL: {{RAZAO_SOCIAL}}\`
    - Adicione \\n\\n.
    - Finalize a mensagem EXATAMENTE com: \`Se precisar de algo, é só chamar no WhatsApp ou dar uma olhada no nosso site {{SITE}}.\\nEquipe {{NOME_ASSOCIACAO}}\`
- medicalHistory: Histórico médico relevante, se houver.
- doctorNotes: Posologia e notas do médico, se houver.
- observations: Alertas importantes para a equipe (ex: data de emissão ausente, receita vencida, etc.).
`
};

/**
 * Generates the configuration data block for the system prompt.
 * @param settings - The current application settings.
 * @returns A formatted string with all configuration data.
 */
const generateConfigurationBlock = (settings: Settings): string => {
  return `
# DADOS OPERACIONAIS
{{VALOR_FRETE_PADRAO}}: 50.00
{{CHAVE_PIX_CNPJ}}: "${settings.pixKey}"
{{RAZAO_SOCIAL}}: "${settings.companyName}"
{{NOME_BANCO}}: "${settings.bankName}"
{{TAXA_CARTAO_CREDITO_PERCENTUAL}}: 3.98
{{PRESCRIPTION_VALIDITY_MONTHS}}: "${settings.prescriptionValidityMonths || '1'}"
{{TEXTO_FRETE}}: "${settings.shippingContext}"
{{TEXTO_PAGAMENTO}}: "${settings.paymentContext}"
{{PRAZO_PRODUCAO_ENTREGA}}: "${settings.productionTime}"

# DADOS DE CONTATO E INSTITUCIONAIS
{{NOME_ASSOCIACAO}}: "${settings.associationName}"
{{ENDERECO}}: "${settings.address}"
{{WHATSAPP}}: "${settings.whatsapp}"
{{SITE}}: "${settings.site}"
{{INSTAGRAM}}: "${settings.instagram}"

# CONTEXTO ADICIONAL
Sobre a Associação: ${settings.about}
Horário de Funcionamento: ${settings.operatingHours}
  `.trim();
};

/**
 * Generates the product table in Markdown format for the system prompt.
 * @param products - An array of products (either from WooCommerce or local settings).
 * @param isFromWooCommerce - A boolean indicating the source of the products.
 * @returns A formatted string containing the product table and a source comment.
 */
const generateProductTable = (products: (WooProduct | Product)[], isFromWooCommerce: boolean): string => {
  const stripHtml = (html: string) => (html ? html.replace(/<[^>]*>?/gm, '') : '');

  const tableHeader = `| Nome do Produto | Preço (R$) | Descrição Breve |
|---|---|---|`;

  const tableRows = products.length > 0
    ? products.map(p => {
        const desc = 'short_description' in p ? stripHtml(p.short_description) : p.description;
        return `| ${p.name} | ${p.price} | ${desc || ''} |`;
      }).join('\n')
    : '| Nenhum produto cadastrado | - | - |';
    
  const sourceComment = isFromWooCommerce
    ? '# Fonte dos Produtos: WooCommerce API (em tempo real)'
    : '# Fonte dos Produtos: Lista de Fallback Manual (API indisponível ou sem produtos)';

  return `
# TABELA DE PRODUTOS OFICIAL
${sourceComment}
${tableHeader}
${tableRows}
  `.trim();
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
  products: [], // Products are now fetched from API, this is just for type compatibility.
  prescriptionValidityMonths: '1',
  shippingContext: "O frete padrão é de R$ 50,00.",
  paymentContext: "Aceitamos pagamento via PIX ou Cartão de Crédito (com uma taxa de processamento de 3,98%). É só escolher a opção que preferir.",
};

const defaultWpConfig: WpConfig = {
    url: '',
    consumerKey: '',
    consumerSecret: '',
    username: '',
    applicationPassword: '',
};


// --- Context & Provider ---
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOnline } = useConnection();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [formState, setFormState] = useState<Settings>(defaultSettings);
  const [wpConfig, setWpConfig] = useState<WpConfig>(defaultWpConfig);
  const [wpConnectionStatus, setWpConnectionStatus] = useState<ConnectionStatus>('idle');
  const [isLoaded, setIsLoaded] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Settings, string>>>({});
  
  // WooCommerce State
  const [wooProducts, setWooProducts] = useState<WooProduct[]>([]);
  const [wooCategories, setWooCategories] = useState<WooCategory[]>([]);
  const [isWooLoading, setIsWooLoading] = useState(false);
  const [wooError, setWooError] = useState<string | null>(null);
  const [lastWooSync, setLastWooSync] = useState<Date | null>(null);
  
  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [settingsSyncQueueCount, setSettingsSyncQueueCount] = useState(0);

  // Sync process
  const processSync = useCallback(async () => {
    const isPending = localStorage.getItem(SETTINGS_SYNC_PENDING_KEY) === 'true';
    if (!isOnline || isSyncing || !isPending) {
      return;
    }

    setIsSyncing(true);
    try {
      const storedSettings = localStorage.getItem(LOCAL_SETTINGS_KEY);
      if (storedSettings) {
        const settingsToSync = JSON.parse(storedSettings);
        await apiClient.post('/settings', settingsToSync);
        localStorage.removeItem(SETTINGS_SYNC_PENDING_KEY);
        setSettingsSyncQueueCount(0);
        console.log("Settings synced successfully to backend.");
      }
    } catch (error) {
      console.error("Failed to sync settings:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  // Effect to trigger sync when coming online
  useEffect(() => {
    if (isOnline) {
      processSync();
    }
  }, [isOnline, processSync]);
  
  // Load initial data on mount. Prioritize API when online.
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoaded(false);
      try {
        let loadedSettings: Settings | null = null;

        // 1. Prioritize fetching from API if online
        if (isOnline) {
          try {
            console.log("Online mode detected. Fetching settings from API...");
            loadedSettings = await apiClient.get<Settings>('/settings');
            if (loadedSettings) {
              // Update local cache with fresh data from the server
              localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(loadedSettings));
            }
          } catch (apiError) {
             console.warn("API fetch failed, will fall back to local storage.", apiError);
          }
        }
        
        // 2. Fallback to local storage if offline, or if API fetch failed/returned null
        if (!loadedSettings) {
           console.log(isOnline ? "API returned no settings, falling back to local." : "Offline mode. Loading settings from local storage.");
           const localData = localStorage.getItem(LOCAL_SETTINGS_KEY);
           if (localData) {
               loadedSettings = JSON.parse(localData);
           }
        }
        
        const finalSettings = loadedSettings || defaultSettings;
        setSettings(finalSettings);
        setFormState(finalSettings);

        // 3. Load other non-critical settings from localStorage
        const storedWpConfig = localStorage.getItem(WP_CONFIG_STORAGE_KEY);
        if (storedWpConfig) {
          setWpConfig({ ...defaultWpConfig, ...JSON.parse(storedWpConfig) });
        }
        const syncPending = localStorage.getItem(SETTINGS_SYNC_PENDING_KEY) === 'true';
        setSettingsSyncQueueCount(syncPending ? 1 : 0);
      } catch (error) {
        console.error("Failed to load initial settings:", error);
        // On any critical error, ensure the app loads with defaults or whatever is in local storage.
        const localData = localStorage.getItem(LOCAL_SETTINGS_KEY);
        const finalSettings = localData ? JSON.parse(localData) : defaultSettings;
        setSettings(finalSettings);
        setFormState(finalSettings);
      } finally {
        setIsLoaded(true);
      }
    };

    loadInitialData();
  }, [isOnline]); // Re-run this logic when connection status changes


  const validateSettings = useCallback((data: Settings): boolean => {
    const newErrors: Partial<Record<keyof Settings, string>> = {};

    const requiredFields: Array<keyof Settings> = [
      'associationName',
      'address',
      'whatsapp',
      'pixKey',
      'companyName',
      'bankName',
      'prescriptionValidityMonths',
      'shippingContext',
      'paymentContext',
    ];

    requiredFields.forEach(field => {
      const value = data[field];
      if (typeof value === 'string' && (!value.trim() || value.includes('[Insira'))) {
        newErrors[field] = 'Este campo é obrigatório.';
      }
    });

    // WhatsApp format validation: (XX) 9XXXX-XXXX or similar variations
    const whatsappRegex = /^\(\d{2}\)\s?9\s?\d{4}-?\d{4}$/; 
    if (data.whatsapp && data.whatsapp.trim() && !newErrors.whatsapp && !whatsappRegex.test(data.whatsapp)) {
        newErrors.whatsapp = 'Formato inválido. Ex: (11) 91234-5678.';
    }

    if (data.prescriptionValidityMonths && !newErrors.prescriptionValidityMonths) {
        const months = Number(data.prescriptionValidityMonths);
        if (isNaN(months) || !Number.isInteger(months) || months <= 0) {
            newErrors.prescriptionValidityMonths = 'Deve ser um número inteiro positivo.';
        }
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  const saveSettings = useCallback(async (newSettings: Settings) => {
    setSettings(newSettings);
    try {
        localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(newSettings));
        localStorage.setItem(SETTINGS_SYNC_PENDING_KEY, 'true');
        setSettingsSyncQueueCount(1);
        await processSync(); // Attempt to sync immediately if online
    } catch (error) {
        console.error("Failed to save settings to localStorage:", error);
    }
  }, [processSync]);

  const saveWpConfig = useCallback(async (newConfig: WpConfig) => {
    setWpConfig(newConfig);
    try {
      localStorage.setItem(WP_CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    } catch (error) {
      console.error("Failed to save WP config to localStorage", error);
    }
  }, []);

  const testWpConnection = useCallback(async (configToTest: WpConfig): Promise<boolean> => {
    setWpConnectionStatus('testing');
    try {
      const status = await checkApiStatus(configToTest);
      // FIX: Corrected typo from `sativarClients` to `sativarUsers` to match the `ApiStatus` type definition.
      const isSuccess = status.wooCommerce === 'success' && status.sativarUsers === 'success';
      if (isSuccess) {
          setWpConnectionStatus('success');
      } else {
          setWpConnectionStatus('error');
      }
      return isSuccess;
    } catch (error) {
      console.error("WP connection test failed:", error);
      setWpConnectionStatus('error');
      return false;
    }
  }, []);
  
  const syncWithWooCommerce = useCallback(async () => {
    if (!wpConfig.url || !wpConfig.consumerKey) {
        setWooError("API do WordPress não configurada. Por favor, preencha os dados na página 'Configuração da API'.");
        return;
    }
    setIsWooLoading(true);
    setWooError(null);
    try {
        const [products, categories] = await Promise.all([
            getProducts(wpConfig),
            getCategories(wpConfig),
        ]);
        setWooProducts(products);
        setWooCategories(categories);
        setLastWooSync(new Date());
    } catch (err) {
        console.error("Failed to sync with WooCommerce", err);
        setWooError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido ao sincronizar com o WooCommerce. Verifique as configurações da API e sua conexão.");
        setWooProducts([]);
        setWooCategories([]);
    } finally {
        setIsWooLoading(false);
    }
  }, [wpConfig]);
  
  const forceSyncSettings = useCallback(async () => {
    await processSync();
  }, [processSync]);

  const hasUnsavedChanges = useMemo(() => JSON.stringify(formState) !== JSON.stringify(settings), [formState, settings]);

  const systemPrompt = useMemo(() => {
    const isFromWooCommerce = wooProducts.length > 0;
    const productSource = isFromWooCommerce ? wooProducts : settings.products;

    const configBlock = generateConfigurationBlock(settings);
    const productTable = generateProductTable(productSource, isFromWooCommerce);

    // Assemble the final prompt in a modular way
    return [
      PROMPT_PARTS.CONFIGURATION_HEADER,
      configBlock,
      PROMPT_PARTS.PERSONA,
      PROMPT_PARTS.KNOWLEDGE_BASE,
      PROMPT_PARTS.JSON_OUTPUT_INSTRUCTIONS,
      productTable
    ].join('\n\n');
  }, [settings, wooProducts]);

  const value = useMemo(() => ({ 
      settings, 
      isLoaded,
      saveSettings,
      wpConfig,
      wpConnectionStatus,
      saveWpConfig,
      testWpConnection,
      systemPrompt,
      isOnline,
      isSyncing,
      settingsSyncQueueCount,
      forceSyncSettings,
      formState,
      setFormState,
      hasUnsavedChanges,
      wooProducts,
      wooCategories,
      isWooLoading,
      wooError,
      lastWooSync,
      syncWithWooCommerce,
      validateSettings,
      errors,
  }), [settings, isLoaded, saveSettings, wpConfig, wpConnectionStatus, saveWpConfig, testWpConnection, systemPrompt, isOnline, isSyncing, settingsSyncQueueCount, forceSyncSettings, formState, hasUnsavedChanges, wooProducts, wooCategories, isWooLoading, wooError, lastWooSync, syncWithWooCommerce, validateSettings, errors]);

  return React.createElement(SettingsContext.Provider, { value }, children);
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};