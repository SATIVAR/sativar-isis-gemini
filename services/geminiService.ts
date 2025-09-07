import { GoogleGenAI } from "@google/genai";
import type { QuoteResult, QuotedProduct } from "../types.ts";
import { addApiCall } from "./apiHistoryService.ts";

const API_CALL_COUNTER_KEY = 'sativar_isis_api_call_count';
// FIX: Updated error message to refer to API_KEY as per Gemini API guidelines.
const API_KEY_MISSING_ERROR = "A chave da API do Gemini não foi configurada no ambiente. Um administrador precisa definir a variável de ambiente API_KEY.";

const incrementApiCallCount = () => {
    try {
        const currentCount = parseInt(localStorage.getItem(API_CALL_COUNTER_KEY) || '0', 10);
        localStorage.setItem(API_CALL_COUNTER_KEY, (currentCount + 1).toString());
    } catch (e) {
        console.error("Could not update API call count in localStorage", e);
    }
};

const getApiKey = (): string | undefined => {
    // In a Vite project, client-side environment variables must be prefixed with VITE_
    // and are accessed via import.meta.env.
    // FIX: Switched from import.meta.env.VITE_API_KEY to process.env.API_KEY to follow Gemini API guidelines and resolve TypeScript error.
    return process.env.API_KEY;
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

const parseGeminiResponse = (responseText: string): QuoteResult => {
    const internalSummaryMarker = "[PARTE 1: RESUMO INTERNO PARA A EQUIPE]";
    const patientMessageMarker = "[PARTE 2: MENSAGEM PRONTA PARA O PACIENTE]";

    const internalSummaryIndex = responseText.indexOf(internalSummaryMarker);
    const patientMessageIndex = responseText.indexOf(patientMessageMarker);

    if (internalSummaryIndex === -1 || patientMessageIndex === -1) {
        // Throw a user-friendly error if the response format is incorrect
        throw new Error("A resposta da IA está em um formato inesperado. Não foi possível encontrar os marcadores de seção necessários para a análise. Por favor, tente novamente ou verifique a configuração do prompt do sistema.");
    }

    const internalSummaryText = responseText
        .substring(internalSummaryIndex + internalSummaryMarker.length, patientMessageIndex)
        .trim();
        
    const patientMessage = responseText
        .substring(patientMessageIndex + patientMessageMarker.length)
        .trim();
    
    // Helper to extract single-line values
    const extractValue = (regex: RegExp): string => {
        const match = internalSummaryText.match(regex);
        return match ? match[1].trim() : '';
    };

    const patientName = extractValue(/- Paciente:\s*(.*)/i);
    const validity = extractValue(/- Receita:\s*(.*)/i);
    const totalValue = extractValue(/- Valor Total:\s*(.*)/i);
    const medicalHistory = extractValue(/-\s*Histórico Médico \(se houver\):\s*(.*)/is);
    const doctorNotes = extractValue(/-\s*Notas do Médico \(se houver\):\s*(.*)/is);
    const observations = extractValue(/-\s*Observações:\s*(.*)/is);
    
    const products: QuotedProduct[] = [];
    const productLines = internalSummaryText.match(/- Item:\s*.*/gi) || [];

    for (const line of productLines) {
        const productMatch = line.match(/- Item:\s*(.*?)\s*\|\s*Quantidade:\s*(.*?)\s*\|\s*Concentração:\s*(.*?)\s*\|\s*Status:\s*(.*)/i);
        if (productMatch) {
            products.push({
                name: productMatch[1].trim() || 'Produto não identificado',
                quantity: productMatch[2].trim() || 'N/A',
                concentration: productMatch[3].trim() || 'N/A',
                status: productMatch[4].trim() || 'Status desconhecido',
            });
        }
    }
    
    return { 
        id: crypto.randomUUID(),
        patientName: patientName || 'Não encontrado',
        internalSummary: internalSummaryText,
        patientMessage, 
        validity: validity || 'Informação ausente',
        products,
        totalValue: totalValue || 'Não encontrado',
        medicalHistory, 
        doctorNotes,
        observations,
    };
};

const handleGeminiError = (error: unknown): Error => {
    console.error("Erro ao chamar a API Gemini:", error);

    if (error instanceof Error) {
        const message = error.message;
        const lowerMessage = message.toLowerCase();

        // API Key issues
        if (lowerMessage.includes('api key not valid') || lowerMessage.includes('api_key_invalid') || message.includes('[401]') || message.includes('[403]')) {
            // FIX: Updated error message to refer to API_KEY as per Gemini API guidelines.
            return new Error("A chave da API do Gemini é inválida, expirou ou não possui as permissões necessárias. Um administrador deve verificar a configuração da variável de ambiente API_KEY no servidor.");
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
        
        // Return a slightly more informative generic error if it's from Gemini
        if (lowerMessage.includes('gemini') || message.includes('A resposta da IA está em um formato inesperado')) {
            return new Error(`Falha na comunicação com a IA: ${message}`);
        }
        
        // Generic fallback with original error message
        return new Error(`Falha na comunicação com a IA: ${message}`);
    }

    // Fallback for non-Error objects
    return new Error("Ocorreu um erro desconhecido ao se comunicar com a IA. Verifique o console para mais detalhes.");
};

export const processPrescription = async (file: File, systemPrompt: string): Promise<QuoteResult> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error(API_KEY_MISSING_ERROR);
    }
    const ai = new GoogleGenAI({ apiKey });
    
    const imagePart = await fileToGenerativePart(file);
    
    const textPart = {
        text: "Analise a receita médica em anexo e gere o orçamento seguindo estritamente as instruções e o formato definidos no seu prompt de sistema."
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, imagePart] },
            config: {
                systemInstruction: systemPrompt,
            }
        });

        incrementApiCallCount();
        addApiCall({ type: 'prescription_analysis', status: 'success', details: file.name });

        const responseText = response.text;
        if (!responseText) {
            throw new Error("A IA não retornou uma resposta de texto.");
        }
        
        return parseGeminiResponse(responseText);

    } catch (error) {
        addApiCall({ type: 'prescription_analysis', status: 'error', details: file.name, error: error instanceof Error ? error.message : String(error) });
        throw handleGeminiError(error);
    }
};

export const pingAI = async (userMessage: string, settingsIncomplete: boolean): Promise<string> => {
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
        
        incrementApiCallCount();
        const details = userMessage.length > 75 ? `${userMessage.substring(0, 75)}...` : userMessage;
        addApiCall({ type: 'text_query', status: 'success', details });

        const responseText = response.text;
        if (!responseText) {
            throw new Error("A IA não retornou uma resposta de texto.");
        }
        
        return responseText;

    } catch (error) {
        const details = userMessage.length > 75 ? `${userMessage.substring(0, 75)}...` : userMessage;
        addApiCall({ type: 'text_query', status: 'error', details, error: error instanceof Error ? error.message : String(error) });
        throw handleGeminiError(error);
    }
};