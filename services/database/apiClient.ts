// The execution environment provides environment variables via `process.env`.
// Using `import.meta.env` causes a runtime error, so we switch to `process.env` for consistency
// with how the Gemini API key is accessed.
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const apiKey = process.env.VITE_API_SECRET_KEY;
    
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
      // Improve network error handling to provide a more descriptive message.
      if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
        const enhancedError = new Error(
          `Network error: Failed to connect to the API server at ${API_BASE_URL}. Please check if the server is running and accessible.`
        );
        console.error(`API request failed for endpoint: ${endpoint}`, enhancedError);
        throw enhancedError;
      }

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