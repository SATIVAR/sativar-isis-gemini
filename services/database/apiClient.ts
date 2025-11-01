// In a Vite project, environment variables are exposed on `import.meta.env`.
// They must be prefixed with `VITE_` to be accessible in the client-side code.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!API_BASE_URL) {
      // This is a configured-offline state, not a network error.
      // Throw a specific error that can be handled gracefully by other parts of the app.
      throw new Error('API server not configured. Running in offline mode.');
    }
    
    const url = `${API_BASE_URL}${endpoint}`;
    
    const apiKey = import.meta.env.VITE_API_SECRET_KEY;
    
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
      let finalError = error;
      // Improve network error handling to provide a more descriptive message.
      if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
        finalError = new Error(
          `Network error: Failed to connect to the API server at ${API_BASE_URL}. Please check if the server is running and accessible.`
        );
      }

      // Only log errors for endpoints that are not the health check to avoid console spam.
      if (endpoint !== '/health') {
        console.error(`API request failed for endpoint: ${endpoint}`, finalError);
      }
      throw finalError;
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
