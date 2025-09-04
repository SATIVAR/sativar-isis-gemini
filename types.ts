export interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
}

export interface Settings {
  associationName: string;
  about: string;
  operatingHours: string;
  productionTime: string;
  address: string;
  whatsapp: string;
  site: string;
  instagram: string;
  pixKey: string;
  companyName: string;
  bankName: string;
  products: Product[];
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