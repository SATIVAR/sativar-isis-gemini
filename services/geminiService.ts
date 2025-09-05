import { GoogleGenAI } from "@google/genai";
import type { QuoteResult, QuotedProduct } from "../types";

export const API_KEY_STORAGE_KEY = 'sativar_isis_gemini_api_key';
const API_CALL_COUNTER_KEY = 'sativar_isis_api_call_count';

const incrementApiCallCount = () => {
    try {
        const currentCount = parseInt(localStorage.getItem(API_CALL_COUNTER_KEY) || '0', 10);
        localStorage.setItem(API_CALL_COUNTER_KEY, (currentCount + 1).toString());
    } catch (e) {
        console.error("Could not update API call count in localStorage", e);
    }
};


const getApiKey = (): string | undefined => {
    try {
        const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
        if (storedKey) {
            return storedKey;
        }
    } catch (e) {
        console.error("Could not access localStorage for API key", e);
    }
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
        console.warn("Could not find response markers. Returning full text as patient message.");
        return {
            id: crypto.randomUUID(),
            patientName: "Paciente Desconhecido",
            internalSummary: "Não foi possível analisar a resposta da IA. Verifique o formato do prompt nas configurações.",
            patientMessage: responseText,
            validity: 'Não encontrado',
            products: [],
            totalValue: 'Não encontrado',
        };
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
                name: productMatch[1].trim(),
                quantity: productMatch[2].trim(),
                concentration: productMatch[3].trim(),
                status: productMatch[4].trim(),
            });
        }
    }
    
    return { 
        id: crypto.randomUUID(),
        patientName: patientName || 'Não encontrado',
        internalSummary: internalSummaryText, // Keep the raw text for display/debug
        patientMessage, 
        validity,
        products,
        totalValue,
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
            return new Error("A chave da API do Gemini é inválida ou não foi configurada corretamente. Verifique a chave nas configurações.");
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
        if (lowerMessage.includes('gemini')) {
            return new Error(`Ocorreu um erro inesperado com a IA Gemini: ${message}`);
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
        throw new Error("A chave da API do Gemini não foi configurada.");
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

        const responseText = response.text;
        if (!responseText) {
            throw new Error("A IA não retornou uma resposta de texto.");
        }
        
        return parseGeminiResponse(responseText);

    } catch (error) {
        throw handleGeminiError(error);
    }
};

export const pingAI = async (userMessage: string, settingsIncomplete: boolean): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("A chave da API do Gemini não foi configurada.");
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

        const responseText = response.text;
        if (!responseText) {
            throw new Error("A IA não retornou uma resposta de texto.");
        }
        
        return responseText;

    } catch (error) {
        throw handleGeminiError(error);
    }
};