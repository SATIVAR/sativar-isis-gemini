

// From services/geminiService.ts and components/Chat.tsx
export interface QuotedProduct {
    name: string;
    quantity: string;
    concentration: string;
    status: string;
    suggestionNotes?: string;
}

export interface QuoteResult {
    id: string;
    patientName: string;
    internalSummary: string;
    patientMessage: string;
    validity: string;
    products: QuotedProduct[];
    totalValue: string;
    medicalHistory?: string;
    doctorNotes?: string;
    observations?: string;
}

// From components/QuoteGenerator.tsx and components/Chat.tsx
export type MessageContentType = 'text' | 'file_request' | 'loading' | 'quote' | 'error' | 'actions' | 'user_result';

export interface TextContent {
    type: 'text';
    text: string;
}

export interface FileRequestContent {
    type: 'file_request';
    fileName: string;
}

export interface LoadingContent {
    type: 'loading';
}

export interface QuoteContent {
    type: 'quote';
    result: QuoteResult;
}

export interface ErrorContent {
    type: 'error';
    message: string;
}

export interface Action {
    label: string;
    payload: string;
}

export interface ActionsContent {
    type: 'actions';
    text?: string;
    actions: Action[];
}

export interface UserResultContent {
    type: 'user_result';
    users: SativarUser[];
    searchTerm: string;
}

export type MessageContent = TextContent | FileRequestContent | LoadingContent | QuoteContent | ErrorContent | ActionsContent | UserResultContent;

export interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    content: MessageContent;
    isActionComplete?: boolean;
}


// From hooks/useSettings.ts
export interface Product {
    id: string;
    name: string;
    price: string;
    description: string;
    icon?: string;
}

export interface DatabaseConfig {
    type: 'none' | 'mysql';
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

// From hooks/useSettings.ts and components/settings/ApiConfigPage.tsx and services/wpApiService.ts
export interface WpConfig {
    url: string;
    consumerKey: string;
    consumerSecret: string;
    username?: string;
    applicationPassword?: string;
}

export interface WooProductImage {
    id: number;
    src: string;
    name: string;
}

export interface WooProductCategory {
    id: number;
    name: string;
    slug: string;
}

export interface WooProduct {
    id: number;
    name: string;
    price: string;
    short_description: string;
    stock_quantity: number | null;
    images: WooProductImage[];
    categories: WooProductCategory[];
}

export interface WooCategory {
    id: number;
    name: string;
    slug: string;
    count: number;
}


// From services/database/repositories/interfaces.ts
export interface Task {
    id: string;
    text: string;
    isCompleted: boolean;
    icon?: string;
}
export interface Reminder {
    id: string;
    quoteId: string;
    patientName: string;
    dueDate: string; // ISO string
    notes: string;
    tasks: Task[];
    isCompleted: boolean;
    recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
    priority: 'low' | 'medium' | 'high';
}

// From services/wpApiService.ts (SATIVAR Users)
export interface SativarUser {
    id: number;
    display_name: string;
    email: string;
    acf_fields: {
        cpf?: string;
        telefone?: string;
        tipo_associacao?: string;
        nome_completo_responc?: string;
        cpf_responsavel?: string;
        nome_completo?: string;
    };
}


// FIX: Add Vite client types to fix import.meta.env errors across the application.
// This avoids the need for triple-slash directives in multiple files and provides type safety.
declare global {
  interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY?: string;
    readonly VITE_API_URL?: string;
    readonly VITE_API_SECRET_KEY?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}