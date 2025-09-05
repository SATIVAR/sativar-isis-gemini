// Cliente API simplificado para comunicação com o backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Generic query method
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const response = await this.request<{ success: boolean; rows: T[]; error?: string }>('/api/db/query', {
      method: 'POST',
      body: JSON.stringify({ query: sql, params }),
    });

    if (!response.success) {
      throw new Error(response.error || 'Query failed');
    }

    return response.rows;
  }

  // Settings methods
  async getSettings(): Promise<Record<string, any>> {
    return this.request<Record<string, any>>('/api/settings');
  }

  async setSetting(key: string, value: any): Promise<void> {
    await this.request('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ key, value }),
    });
  }

  // Products methods
  async getProducts(): Promise<any[]> {
    return this.request<any[]>('/api/products');
  }

  async createProduct(product: { name: string; price: number; description?: string }): Promise<any> {
    return this.request('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  // Quotes methods
  async getQuotes(): Promise<any[]> {
    return this.request<any[]>('/api/quotes');
  }

  async createQuote(quote: { patient_name: string; prescription_text: string; total_amount: number }): Promise<any> {
    return this.request('/api/quotes', {
      method: 'POST',
      body: JSON.stringify(quote),
    });
  }

  // Reminders methods
  async getReminders(): Promise<any[]> {
    return this.request<any[]>('/api/reminders');
  }

  async createReminder(reminder: { title: string; description?: string; due_date?: string }): Promise<any> {
    return this.request('/api/reminders', {
      method: 'POST',
      body: JSON.stringify(reminder),
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/api/health');
  }

  // Database status
  async getDatabaseStatus(): Promise<{ success: boolean; connected: boolean; timestamp?: string; error?: string }> {
    return this.request<{ success: boolean; connected: boolean; timestamp?: string; error?: string }>('/api/db/status');
  }
}

export const apiClient = new ApiClient();
export default apiClient;