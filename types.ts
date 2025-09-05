
export interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
  icon?: string;
}

export interface DatabaseConfig {
  type: 'none' | 'mysql' | 'postgres';
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
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
  databaseConfig: DatabaseConfig;
}

export interface Task {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface Reminder {
  id: string;
  title: string;
  tasks: Task[];
  dueDate: string; // YYYY-MM-DD format
  dueTime?: string; // HH:MM format
  isCompleted: boolean;
  quoteId?: string;
  patientName?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  endDate?: string;
  parentId?: string;
}

export interface QuotedProduct {
  name: string;
  quantity: string;
  concentration: string;
  status: string; // e.g., "OK", "ALERTA: Não temos..."
}

export interface QuoteResult {
    id: string;
    patientName: string;
    internalSummary: string; // Will hold the raw summary for reference/debugging
    patientMessage: string;
    medicalHistory?: string;
    doctorNotes?: string;
    observations?: string;
    validity: string;
    products: QuotedProduct[];
    totalValue: string;
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