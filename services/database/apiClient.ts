// In a Vite project, environment variables are accessed via `import.meta.env`
// and must be prefixed with `VITE_` to be exposed to the client-side code.
// FIX: Cast `import.meta` to `any` to resolve TypeScript error about missing 'env' property for Vite env variables.
const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // FIX: Cast `import.meta` to `any` to resolve TypeScript error about missing 'env' property for Vite env variables.
    const apiKey = (import.meta as any).env.VITE_API_SECRET_KEY;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    try {
      const response = await fetch(url, {
        headers,
        ...options,
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorJson = await response.json();
          // Use a specific error from our backend if available
          errorMessage = errorJson.details || errorJson.error || errorJson.message || errorMessage;
        } catch (e) {
          // Response was not JSON or had no body
        }
        throw new Error(errorMessage);
      }
      
      if (response.status === 204) {
        return undefined as T;
      }
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
      } else {
        return undefined as T;
      }

    } catch (error) {
      if (endpoint !== '/health') {
        console.error(`API request failed for endpoint: ${endpoint}`, error);
      }
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: 'ok' }> {
    return this.request('/health');
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(`/api${endpoint}`, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(`/api${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(`/api${endpoint}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(`/api${endpoint}`, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();