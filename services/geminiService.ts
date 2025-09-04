import { GoogleGenAI } from "@google/genai";
import type { QuoteResult } from "../types";

export const isApiKeyConfigured = (): boolean => {
    return !!process.env.API_KEY;
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
        // Fallback if markers are not found
        console.warn("Could not find response markers. Returning full text as patient message.");
        return {
            internalSummary: "Não foi possível analisar a resposta da IA. Verifique o formato do prompt nas configurações.",
            patientMessage: responseText,
        };
    }

    const internalSummary = responseText
        .substring(internalSummaryIndex + internalSummaryMarker.length, patientMessageIndex)
        .trim();
        
    const patientMessage = responseText
        .substring(patientMessageIndex + patientMessageMarker.length)
        .trim();
    
    return { internalSummary, patientMessage };
};

const handleGeminiError = (error: unknown): Error => {
    console.error("Erro ao chamar a API Gemini:", error);

    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('api key not valid') || message.includes('api_key_invalid')) {
            return new Error("A chave da API do Gemini é inválida ou não foi configurada corretamente.");
        }
        
        if (message.includes('quota')) {
            return new Error("A cota de uso da API foi excedida. Por favor, tente novamente mais tarde.");
        }

        if (message.includes('safety') || message.includes('blocked')) {
            return new Error("A solicitação foi bloqueada por políticas de segurança. Tente usar um arquivo ou texto diferente.");
        }
        
        if (message.includes('fetch failed') || message.includes('network error')) {
            return new Error("Erro de rede ao tentar se comunicar com a IA. Verifique sua conexão com a internet.");
        }

        // For other 4xx/5xx errors, the message might be descriptive enough
        if (message.match(/\[\d{3}\]/)) {
             return new Error(`Ocorreu um erro na API: ${error.message}`);
        }
        
        // Return a slightly more informative generic error
        return new Error(`Falha na comunicação com a IA: ${error.message}`);
    }

    // Fallback for non-Error objects
    return new Error("Ocorreu um erro desconhecido ao se comunicar com a IA. Verifique o console para mais detalhes.");
};

export const processPrescription = async (file: File, systemPrompt: string): Promise<QuoteResult> => {
    if (!process.env.API_KEY) {
        throw new Error("A chave da API do Gemini não foi configurada.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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
    if (!process.env.API_KEY) {
        throw new Error("A chave da API do Gemini não foi configurada.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

        const responseText = response.text;
        if (!responseText) {
            throw new Error("A IA não retornou uma resposta de texto.");
        }
        
        return responseText;

    } catch (error) {
        throw handleGeminiError(error);
    }
};