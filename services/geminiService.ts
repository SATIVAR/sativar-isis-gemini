import { GoogleGenAI } from "@google/genai";
import type { QuoteResult } from "../types";

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
        console.error("Erro ao chamar a API Gemini:", error);
        throw new Error("Falha na comunicação com a IA. Verifique o console para mais detalhes.");
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
        console.error("Erro ao chamar a API Gemini:", error);
        throw new Error("Falha na comunicação com a IA. Verifique o console para mais detalhes.");
    }
};