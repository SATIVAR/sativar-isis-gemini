import type { GoogleGenAI } from '@google/genai';

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
export type MessageContentType = 'text' | 'file_request' | 'loading' | 'quote' | 'error' | 'actions' | 'associate_search' | 'product_search';

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

export interface AssociateSearchContent {
    type: 'associate_search';
}

export type MessageContent = TextContent | FileRequestContent | LoadingContent | QuoteContent | ErrorContent | ActionsContent | ProductSearchContent | AssociateSearchContent;

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
    isIsisAiEnabled: boolean;
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

// From hooks/useChatHistory.ts
export interface Conversation {
  id: string;
  title: string;
  created_at: string; // ISO string
  updated_at: string; // ISO string
  is_closed: boolean;
}

// From hooks/useAuth.ts
export type UserRole = 'admin' | 'manager' | 'user';

export interface User {
    id: string;
    name: string;
    whatsapp?: string;
    role: UserRole;
    // Password should not be part of the client-side type
}

// From Seishat Associates Feature
export type AssociateType = 'paciente' | 'responsavel' | 'tutor' | 'colaborador';

export interface Associate {
  id: string;
  full_name: string;
  cpf?: string;
  whatsapp?: string;
  type: AssociateType;
  // Password is not stored on the client
}

// FIX: Add Form Builder types to be shared across components.
// From Form Builder Feature
export type FormFieldType = 'text' | 'email' | 'select' | 'password' | 'textarea' | 'checkbox' | 'radio' | 'separator' | 'brazilian_states_select';

export type ConditionOperator = 'equals' | 'not_equals' | 'is_empty' | 'is_not_empty' | 'contains';

export interface ConditionRule {
    field: string; // field_name of the dependency
    operator: ConditionOperator;
    value?: string; // value to compare against
}

export interface VisibilityConditions {
    relation: 'AND' | 'OR';
    rules: ConditionRule[];
    roles?: AssociateType[]; // for associate-type-based visibility
}

// Represents a field in the central catalog
export interface FormField {
    id: number;
    field_name: string;
    label: string;
    field_type: FormFieldType;
    is_base_field: boolean | number;
    is_deletable: boolean | number;
    options?: string; // JSON string for select/radio options
}

// Represents a field within a specific form's layout
export interface FormLayoutField extends FormField {
    display_order: number;
    is_required: boolean | number;
    visibility_conditions?: VisibilityConditions | null;
}

// Represents a single step in a multi-step form
export interface FormStep {
  id: number | string; // Use string for temporary client-side IDs
  title: string;
  step_order: number;
  fields: FormLayoutField[];
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