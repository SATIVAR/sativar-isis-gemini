

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
  JSON_OUTPUT_INSTRUCTIONS: `[3. SUA TAREFA E FORMATO DE SAÍDA]
Sua tarefa principal é analisar a receita médica fornecida, cruzar as informações com os dados de configuração e a tabela de produtos, e gerar um orçamento completo.
A saída DEVE ser um único objeto JSON, sem nenhum texto, markdown (como \`\`\`json) ou explicação adicional.
O JSON deve seguir estritamente a estrutura definida pela API, e você deve preencher cada campo com o máximo de precisão possível.

# DETALHAMENTO DOS CAMPOS JSON:
- patientName: O nome completo do paciente.
- validity: A validade da receita (ex: "Válida por 30 dias", "Vencida").
- products: Um array com cada produto da receita. Para cada produto, preencha:
    - name: O nome exato do produto conforme a tabela. Se não encontrar, use o nome da receita.
    - quantity: A quantidade prescrita.
    - concentration: A concentração prescrita.
    - status: Use "OK" se o produto foi encontrado na tabela. Se não, use "Alerta: Produto não encontrado no catálogo".
- totalValue: Calcule o valor total somando os preços dos produtos da tabela. Adicione o valor do frete padrão se aplicável. Formate como "R$ XXX,XX".
- internalSummary: Um resumo MUITO BREVE para a equipe, focando em pontos de atenção (ex: "Paciente novo, receita válida. Produto X não está no catálogo.").
- patientMessage: Uma mensagem COMPLETA e amigável para o paciente, incluindo saudação, lista de produtos com preços, valor total, prazo de entrega e as informações de pagamento (PIX).
- medicalHistory: Se a receita mencionar algum histórico médico relevante, transcreva-o aqui. Caso contrário, deixe uma string vazia.
- doctorNotes: Se a receita contiver notas, posologia ou instruções do médico, transcreva-as aqui. Caso contrário, deixe uma string vazia.
- observations: Use este campo para alertas importantes para a equipe. Por exemplo, se a receita estiver vencida, se um produto não for encontrado, ou se houver alguma ambiguidade. Se não houver observações, deixe uma string vazia.
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

# DADOS DE CONTATO E INSTITUCIONAIS
{{NOME_ASSOCIACAO}}: "${settings.associationName}"
{{ENDERECO}}: "${settings.address}"
{{WHATSAPP}}: "${settings.whatsapp}"
{{SITE}}: "${settings.site}"
{{INSTAGRAM}}: "${settings.instagram}"

# CONTEXTO ADICIONAL
Sobre a Associação: ${settings.about}
Horário de Funcionamento: ${settings.operatingHours}
Prazo de Produção e Entrega: ${settings.productionTime}
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
  databaseConfig: { type: 'none', host: '', port: '', user: '', password: '', database: '' },
};

const defaultWpConfig: WpConfig = {
    url: '',
    consumerKey: '',
    consumerSecret: ''
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

  // Load initial local settings, WP config, and check queue
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(LOCAL_SETTINGS_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings(parsedSettings);
        setFormState(parsedSettings);
      }
      const storedWpConfig = localStorage.getItem(WP_CONFIG_STORAGE_KEY);
      if (storedWpConfig) {
        setWpConfig(JSON.parse(storedWpConfig));
      }
      const syncPending = localStorage.getItem(SETTINGS_SYNC_PENDING_KEY) === 'true';
      setSettingsSyncQueueCount(syncPending ? 1 : 0);
    } catch (error) {
      console.error("Failed to load settings from localStorage:", error);
    } finally {
        setIsLoaded(true);
    }
  }, []);

  // Sync formState with settings when settings are loaded or updated
  useEffect(() => {
    if (isLoaded) {
      setFormState(settings);
    }
  }, [settings, isLoaded]);

  const validateSettings = useCallback((data: Settings): boolean => {
    const newErrors: Partial<Record<keyof Settings, string>> = {};

    const requiredFields: Array<keyof Settings> = [
      'associationName',
      'address',
      'whatsapp',
      'pixKey',
      'companyName',
      'bankName',
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
      const isSuccess = status.wooCommerce === 'success' && status.sativarClients === 'success';
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