const API_BASE_URL = process.env.API_URL || 'http://localhost:3001'; // The backend server URL

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // It's assumed that process.env.API_SECRET_KEY is exposed to the frontend build process.
    const apiKey = process.env.API_SECRET_KEY;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    try {
      const response = await fetch(url, {
        headers, // Use the new headers object
        ...options,
      });

      if (!response.ok) {
        // Handle specific auth error from our new middleware
        if (response.status === 401 || response.status === 503) {
          const errorJson = await response.json();
          throw new Error(errorJson.error || 'API authentication failed.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Handle cases where the response might be empty (e.g., a 204 No Content)
      if (response.status === 204) {
        return undefined as T;
      }
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
      } else {
        return undefined as T; // Or handle as appropriate for your app
      }

    } catch (error) {
      // Silence expected health check failures to avoid console noise when offline.
      if (endpoint !== '/health') {
        console.error(`API request failed for endpoint: ${endpoint}`, error);
      }
      throw error; // Re-throw to be caught by the calling hook
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

// Singleton instance to be used across the app
export const apiClient = new ApiClient();