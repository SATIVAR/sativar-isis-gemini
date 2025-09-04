export interface Settings {
  systemPrompt: string;
}

export interface QuoteResult {
    internalSummary: string;
    patientMessage: string;
}

export type MessageSender = 'user' | 'ai';

export type MessageContent = 
  | { type: 'text'; text: string }
  | { type: 'file_request'; fileName: string }
  | { type: 'quote'; result: QuoteResult }
  | { type: 'loading' }
  | { type: 'error', message: string };

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  content: MessageContent;
}