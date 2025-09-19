import { GoogleGenAI, Type } from "@google/genai";
import type { QuoteResult } from "../types.ts";
import { addApiCall } from "./apiHistoryService.ts";

const API_KEY_MISSING_ERROR = "A chave da API do Gemini não foi configurada. Um administrador precisa definir a variável de ambiente VITE_GEMINI_API_KEY.";

const getApiKey = (): string | undefined => {
    // In a Vite project, client-side environment variables must be prefixed with VITE_
    // and are accessed via import.meta.env.
    return import.meta.env.VITE_GEMINI_API_KEY;
};

export const isApiKeyConfigured = (): boolean => {
    return !!getApiKey();
};

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
        } else {
            resolve('');
        }
    };
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const quoteResultSchema = {
    type: Type.OBJECT,
    properties: {
        patientName: { type: Type.STRING, description: "Nome completo do paciente encontrado na receita." },
        internalSummary: { type: Type.STRING, description: "Um resumo conciso para a equipe interna, listando os produtos, quantidades e status." },
        patientMessage: { type: Type.STRING, description: "A mensagem completa formatada para ser enviada diretamente ao paciente, incluindo saudação, produtos, valores e informações de pagamento." },
        validity: { type: Type.STRING, description: "Status da validade da receita (ex: 'Válida', 'Vencida')." },
        products: {
            type: Type.ARRAY,
            description: "Lista de produtos extraídos da receita.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Nome do produto." },
                    quantity: { type: Type.STRING, description: "Quantidade solicitada." },
                    concentration: { type: Type.STRING, description: "Concentração do produto." },
                    status: { type: Type.STRING, description: "Status do produto (ex: 'OK', 'Alerta: Sugestão de alternativa', 'Alerta: Produto não encontrado no catálogo')." },
                    suggestionNotes: { type: Type.STRING, description: "Nota opcional para a equipe interna explicando a alternativa sugerida para um produto." }
                },
                required: ['name', 'quantity', 'concentration', 'status']
            }
        },
        totalValue: { type: Type.STRING, description: "Valor subtotal do orçamento (soma apenas dos produtos, ex: 'R$ 500,00')." },
        medicalHistory: { type: Type.STRING, description: "Histórico médico relevante mencionado, se houver." },
        doctorNotes: { type: Type.STRING, description: "Notas do médico na receita, se houver." },
        observations: { type: Type.STRING, description: "Observações importantes ou alertas gerados pela IA para a equipe interna." },
    },
    required: ['patientName', 'internalSummary', 'patientMessage', 'validity', 'products', 'totalValue']
};


const handleGeminiError = (error: unknown): Error => {
    console.error("Erro ao chamar a API Gemini:", error);

    if (error instanceof Error) {
        const message = error.message;
        const lowerMessage = message.toLowerCase();

        // API Key issues
        if (lowerMessage.includes('api key not valid') || lowerMessage.includes('api_key_invalid') || message.includes('[401]') || message.includes('[403]')) {
            return new Error("A chave da API do Gemini é inválida, expirou ou não possui as permissões necessárias. Um administrador deve verificar a configuração da variável de ambiente VITE_GEMINI_API_KEY no servidor.");
        }
        
        // Quota issues
        if (lowerMessage.includes('quota') || message.includes('[429]')) {
            return new Error("A cota de uso da API foi excedida. Por favor, tente novamente mais tarde ou verifique seu plano de faturamento do Google AI.");
        }

        // Safety/Content policy issues
        if (lowerMessage.includes('safety') || lowerMessage.includes('blocked')) {
            return new Error("A solicitação foi bloqueada por políticas de segurança. O conteúdo do arquivo ou do texto pode ser sensível. Tente usar um arquivo ou texto diferente.");
        }
        
        // Network issues
        if (lowerMessage.includes('fetch failed') || lowerMessage.includes('network error')) {
            return new Error("Erro de rede ao tentar se comunicar com a IA. Verifique sua conexão com a internet.");
        }

        // Specific message for empty responses
        if (message === "A IA não retornou uma resposta de texto.") {
             return new Error("A IA retornou uma resposta vazia. Isso pode ocorrer por um problema temporário ou devido a filtros de segurança. Tente novamente ou ajuste a sua solicitação.");
        }

        // HTTP status code parsing for more generic errors
        const httpStatusMatch = message.match(/\[(\d{3})\]/);
        if (httpStatusMatch) {
            const statusCode = parseInt(httpStatusMatch[1], 10);
            if (statusCode === 400) {
                 return new Error("A solicitação para a IA foi mal formatada. Isso pode ser um problema com o arquivo enviado ou com a estrutura do pedido. Por favor, tente um arquivo diferente.");
            }
            if (statusCode >= 400 && statusCode < 500) {
                return new Error(`Ocorreu um erro na sua solicitação (Código: ${statusCode}). Verifique os dados enviados e tente novamente.`);
            }
            if (statusCode >= 500) {
                return new Error(`O serviço de IA está enfrentando problemas técnicos (Código: ${statusCode}). Por favor, tente novamente mais tarde.`);
            }
        }
        
        // Return a slightly more informative generic error if it's from Gemini or involves JSON
        if (lowerMessage.includes('gemini') || lowerMessage.includes('json')) {
            return new Error(`Falha na comunicação com a IA: ${message}`);
        }
        
        // Generic fallback with original error message
        return new Error(`Falha na comunicação com a IA: ${message}`);
    }

    // Fallback for non-Error objects
    return new Error("Ocorreu um erro desconhecido ao se comunicar com a IA. Verifique o console para mais detalhes.");
};

export const processPrescription = async (file: File, systemPrompt: string, patientName?: string): Promise<{ result: QuoteResult; tokenCount: number; }> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error(API_KEY_MISSING_ERROR);
    }
    const ai = new GoogleGenAI({ apiKey });
    
    const imagePart = await fileToGenerativePart(file);
    
    const textPart = {
        text: `Analise a receita médica em anexo e gere o orçamento ${patientName ? `para o paciente "${patientName}"` : ''}. Retorne os dados em um formato JSON que obedeça o schema definido. ${patientName ? `IMPORTANTE: Use o nome do paciente fornecido (${patientName}) no campo 'patientName' em vez de tentar extraí-lo do documento.` : ''}`
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, imagePart] },
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseSchema: quoteResultSchema,
            }
        });

        const tokenCount = response.usageMetadata?.totalTokenCount || 0;
        addApiCall({ type: 'prescription_analysis', status: 'success', details: file.name, tokenCount });

        const responseText = response.text;
        if (!responseText) {
            throw new Error("A IA não retornou uma resposta de texto.");
        }
        
        try {
            const parsedResult = JSON.parse(responseText);
            // Add the client-side generated ID
            const result: QuoteResult = { 
                ...parsedResult,
                id: crypto.randomUUID(),
            };
            return { result, tokenCount };
        } catch (jsonError) {
             console.error("Failed to parse JSON response from Gemini:", responseText);
             throw new Error("A resposta da IA não estava no formato JSON esperado.");
        }

    } catch (error) {
        addApiCall({ type: 'prescription_analysis', status: 'error', details: file.name, error: error instanceof Error ? error.message : String(error) });
        throw handleGeminiError(error);
    }
};

export const pingAI = async (userMessage: string, settingsIncomplete: boolean): Promise<{ text: string; tokenCount: number }> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error(API_KEY_MISSING_ERROR);
    }
    const ai = new GoogleGenAI({ apiKey });

    let systemInstruction = "Você é Ísis, uma assistente de IA. Responda de forma breve e amigável em português.";
    if (settingsIncomplete) {
        systemInstruction = "Você é Ísis, uma assistente de IA. Um administrador está testando a conexão. Responda de forma amigável e concisa em português que você está online e funcional, mas que as configurações da associação ainda não foram preenchidas na página 'Configurações', e por isso você ainda não pode gerar orçamentos de receitas. Avise-o para completar o cadastro para liberar todas as suas funcionalidades.";
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userMessage,
            config: {
                systemInstruction: systemInstruction,
            }
        });
        
        const tokenCount = response.usageMetadata?.totalTokenCount || 0;
        const details = userMessage.length > 75 ? `${userMessage.substring(0, 75)}...` : userMessage;
        addApiCall({ type: 'text_query', status: 'success', details, tokenCount });

        const responseText = response.text;
        if (!responseText) {
            throw new Error("A IA não retornou uma resposta de texto.");
        }
        
        return { text: responseText, tokenCount };

    } catch (error) {
        const details = userMessage.length > 75 ? `${userMessage.substring(0, 75)}...` : userMessage;
        addApiCall({ type: 'text_query', status: 'error', details, error: error instanceof Error ? error.message : String(error) });
        throw handleGeminiError(error);
    }
};

export const generateConversationTitle = async (conversationSummary: string): Promise<{ text: string, tokenCount: number }> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.warn("API Key missing, cannot generate dynamic title.");
        return { text: "Análise de Receita", tokenCount: 0 };
    }
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are an expert at creating concise, descriptive titles for chat conversations. Based on the provided summary, generate a title in Portuguese. The title must be 5 words or less. If a patient name is present, include it. Examples: "Orçamento - João Silva", "Dúvida sobre CBD 10%", "Consulta de Estoque".`;
    
    const userMessage = `Conversation Summary: "${conversationSummary}"`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userMessage,
            config: {
                systemInstruction,
                thinkingConfig: { thinkingBudget: 0 } // Low latency for a simple task.
            }
        });
        
        const tokenCount = response.usageMetadata?.totalTokenCount || 0;
        addApiCall({ type: 'text_query', status: 'success', details: 'Generate conversation title', tokenCount });

        const responseText = response.text?.trim();
        if (!responseText) {
            throw new Error("A IA não retornou um título.");
        }
        
        // Basic sanitization, remove quotes
        const text = responseText.replace(/["'“”]/g, '');
        return { text, tokenCount };

    } catch (error) {
        addApiCall({ type: 'text_query', status: 'error', details: 'Generate conversation title', error: error instanceof Error ? error.message : String(error) });
        // Don't throw, just log and return a fallback
        console.error("Failed to generate dynamic title:", error);
        return { text: "Análise de Receita", tokenCount: 0 };
    }
};

export const generateHighlight = async (recentQuoteSummary?: string): Promise<{ text: string; tokenCount: number }> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error(API_KEY_MISSING_ERROR);
    }
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = "Você é Ísis, a assistente de IA da associação. Sua tarefa é criar um post de 'Destaque do Dia' que seja otimista, informativo e convidativo. O post deve ser curto, ideal para redes sociais, e usar emojis para ser amigável. Sempre termine com uma chamada para ação clara, convidando para uma nova consulta ou para entrar em contato.";
    
    const userMessage = recentQuoteSummary
        ? `Aqui está o resumo de um orçamento recente: "${recentQuoteSummary}". Crie um 'Destaque do Dia' baseado neste caso, focando nos resultados positivos e no cuidado oferecido, sem revelar dados pessoais. O tom deve ser inspirador.`
        : `Crie um 'Destaque do Dia' com um fato interessante e positivo sobre o uso de cannabis medicinal. O tom deve ser educativo e encorajador.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userMessage,
            config: {
                systemInstruction: systemInstruction,
            }
        });
        
        const tokenCount = response.usageMetadata?.totalTokenCount || 0;
        const details = recentQuoteSummary ? 'Highlight from quote' : 'Highlight with fact';
        addApiCall({ type: 'text_query', status: 'success', details, tokenCount });

        const responseText = response.text;
        if (!responseText) {
            throw new Error("A IA não retornou uma resposta de texto.");
        }
        
        return { text: responseText, tokenCount };

    } catch (error) {
        const details = recentQuoteSummary ? 'Highlight from quote' : 'Highlight with fact';
        addApiCall({ type: 'text_query', status: 'error', details, error: error instanceof Error ? error.message : String(error) });
        throw handleGeminiError(error);
    }
};