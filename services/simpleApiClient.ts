// Cliente API simplificado para comunicação com o backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ApiResponse<T = any> {
  success?: boolean;
  rows?: T[];
  error?: string;
  code?: string;
}

class SimpleApiClient {
  private baseUrl: string;
  private isOnline: boolean = true;

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
      
      const data = await response.json();
      this.isOnline = true;
      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      this.isOnline = false;
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; dbConnected: boolean }> {
    try {
      return await this.request<{ status: string; timestamp: string; dbConnected: boolean }>('/api/health');
    } catch (error) {
      return { status: 'ERROR', timestamp: new Date().toISOString(), dbConnected: false };
    }
  }

  // Database status
  async getDatabaseStatus(): Promise<{ success: boolean; connected: boolean; timestamp?: string; error?: string }> {
    try {
      return await this.request<{ success: boolean; connected: boolean; timestamp?: string; error?: string }>('/api/db/status');
    } catch (error) {
      return { success: false, connected: false, error: 'Connection failed' };
    }
  }

  // Generic query method with fallback
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const response = await this.request<ApiResponse<T>>('/api/db/query', {
        method: 'POST',
        body: JSON.stringify({ query: sql, params }),
      });

      if (!response.success) {
        throw new Error(response.error || 'Query failed');
      }

      return response.rows || [];
    } catch (error) {
      console.error('Query failed:', error);
      throw error;
    }
  }

  // Settings methods
  async getSettings(): Promise<Record<string, any>> {
    try {
      return await this.request<Record<string, any>>('/api/settings');
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {};
    }
  }

  async setSetting(key: string, value: any): Promise<boolean> {
    try {
      await this.request('/api/settings', {
        method: 'POST',
        body: JSON.stringify({ key, value }),
      });
      return true;
    } catch (error) {
      console.error('Failed to set setting:', error);
      return false;
    }
  }

  // Products methods
  async getProducts(): Promise<any[]> {
    try {
      return await this.request<any[]>('/api/products');
    } catch (error) {
      console.error('Failed to get products:', error);
      return [];
    }
  }

  async createProduct(product: { name: string; price: number; description?: string }): Promise<any | null> {
    try {
      return await this.request('/api/products', {
        method: 'POST',
        body: JSON.stringify(product),
      });
    } catch (error) {
      console.error('Failed to create product:', error);
      return null;
    }
  }

  // Quotes methods
  async getQuotes(): Promise<any[]> {
    try {
      return await this.request<any[]>('/api/quotes');
    } catch (error) {
      console.error('Failed to get quotes:', error);
      return [];
    }
  }

  async createQuote(quote: { patient_name: string; prescription_text: string; total_amount: number }): Promise<any | null> {
    try {
      return await this.request('/api/quotes', {
        method: 'POST',
        body: JSON.stringify(quote),
      });
    } catch (error) {
      console.error('Failed to create quote:', error);
      return null;
    }
  }

  // Reminders methods
  async getReminders(): Promise<any[]> {
    try {
      return await this.request<any[]>('/api/reminders');
    } catch (error) {
      console.error('Failed to get reminders:', error);
      return [];
    }
  }

  async createReminder(reminder: any): Promise<any | null> {
    try {
      return await this.request('/api/reminders', {
        method: 'POST',
        body: JSON.stringify(reminder),
      });
    } catch (error) {
      console.error('Failed to create reminder:', error);
      return null;
    }
  }

  async updateReminder(id: string, reminder: any): Promise<any | null> {
    try {
      return await this.request(`/api/reminders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(reminder),
      });
    } catch (error) {
      console.error('Failed to update reminder:', error);
      return null;
    }
  }

  async deleteReminder(id: string): Promise<boolean> {
    try {
      const response = await this.request<{ success: boolean }>(`/api/reminders/${id}`, {
        method: 'DELETE',
      });
      return response.success;
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      return false;
    }
  }

  // Connection status
  get isConnected(): boolean {
    return this.isOnline;
  }
}

export const simpleApiClient = new SimpleApiClient();
export default simpleApiClient;