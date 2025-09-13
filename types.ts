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
export type MessageContentType = 'text' | 'file_request' | 'loading' | 'quote' | 'error' | 'actions' | 'user_search' | 'product_search';

export interface TextContent {
    type: 'text';
    text: string;
}

export interface FileRequestContent {
    type: 'file_request';
    fileName: string;
    fileURL: string;
    fileType: string;
}

export interface LoadingContent {
    type: 'loading';
    text?: string;
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

export interface ProductSearchContent {
    type: 'product_search';
}

export interface UserSearchContent {
    type: 'user_search';
}

export type MessageContent = TextContent | FileRequestContent | LoadingContent | QuoteContent | ErrorContent | ActionsContent | ProductSearchContent | UserSearchContent;

export interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    content: MessageContent;
    isActionComplete?: boolean;
    timestamp: string;
    tokenCount?: number;
    duration?: number; // in milliseconds
}


// From hooks/useSettings.ts
export interface Product {
    id: string | number; // Allow both UUIDs for manual products and numeric IDs for Sativar - Seishat mapping
    name: string;
    price: string;
    description: string;
    icon?: string;
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
    prescriptionValidityMonths: string;
    shippingContext: string;
    paymentContext: string;
}

// From hooks/useSettings.ts and components/settings/ApiConfigPage.tsx and services/wpApiService.ts
export interface WpConfig {
    url: string;
    consumerKey: string;
    consumerSecret: string;
    username?: string;
    applicationPassword?: string;
}

export interface SativarSeishatProductImage {
    id: number;
    src: string;
    name: string;
}

export interface SativarSeishatProductCategory {
    id: number;
    name: string;
    slug: string;
}

export interface SativarSeishatProduct {
    id: number;
    name: string;
    price: string;
    short_description: string;
    stock_quantity: number | null;
    images: SativarSeishatProductImage[];
    categories: SativarSeishatProductCategory[];
}

export interface SativarSeishatCategory {
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

// From hooks/useChatHistory.ts
export interface Conversation {
  id: string;
  title: string;
  created_at: string; // ISO string
  updated_at: string; // ISO string
  is_closed: boolean;
}

// From hooks/useAuth.ts
export type UserRole = 'admin' | 'user';

export interface User {
    id: string;
    name: string;
    whatsapp?: string;
    role: UserRole;
    // Password should not be part of the client-side type
}


// FIX: Add Vite client types to fix import.meta.env errors across the application.
// This avoids the need for triple-slash directives in multiple files and provides type safety.
declare global {
  interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY?: string;
    readonly VITE_API_BASE_URL?: string; // The correct URL for the backend
    readonly VITE_API_SECRET_KEY?: string;
    readonly DEV?: boolean;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}