
import type { WpConfig, WooProduct, WooCategory, SativarClient } from '../types.ts';

interface ApiRequestOptions extends RequestInit {
  auth: WpConfig;
  params?: Record<string, string | Record<string, string>>;
}

async function apiRequest<T>(endpoint: string, options: ApiRequestOptions): Promise<T> {
  const { auth, params, ...fetchOptions } = options;

  if (!auth.url || !auth.consumerKey || !auth.consumerSecret) {
    throw new Error('Sativar_WP_API API configuration is missing.');
  }

  const url = new URL(endpoint, auth.url);

  const allParams = new URLSearchParams({
    consumer_key: auth.consumerKey,
    consumer_secret: auth.consumerSecret,
  });

  // Handle nested params like acf_filters
  if (params) {
    for (const key in params) {
        const value = params[key];
        if (typeof value === 'object') {
            for (const subKey in value) {
                 allParams.append(`${key}[${subKey}]`, value[subKey]);
            }
        } else {
            allParams.append(key, value);
        }
    }
  }

  url.search = allParams.toString();
  
  const response = await fetch(url.toString(), {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("API Error Response:", errorBody);
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export interface ApiStatus {
  wooCommerce: 'success' | 'error' | 'untested';
  sativarClients: 'success' | 'error' | 'untested';
}

export async function checkApiStatus(auth: WpConfig): Promise<ApiStatus> {
  const status: ApiStatus = {
    wooCommerce: 'untested',
    sativarClients: 'untested',
  };

  if (!auth.url || !auth.consumerKey || !auth.consumerSecret) {
    return { wooCommerce: 'error', sativarClients: 'error' };
  }

  try {
    await apiRequest('/wp-json/wc/v3/products', { auth, method: 'GET', params: { per_page: '1' } });
    status.wooCommerce = 'success';
  } catch (e) {
    console.error("WooCommerce API check failed:", e);
    status.wooCommerce = 'error';
  }

  try {
    // Correct endpoint for Sativar WordPress users
    await apiRequest('/wp-json/sativar/v1/clientes', { auth, method: 'GET', params: { per_page: '1' } });
    status.sativarClients = 'success';
  } catch (e) {
    console.error("Sativar Clients API check failed:", e);
    status.sativarClients = 'error';
  }

  return status;
}

export async function getProducts(auth: WpConfig, search: string = ''): Promise<WooProduct[]> {
    const params: Record<string, string> = {
        per_page: '100', // Fetch up to 100 products
        status: 'publish', // Fetch only published products
    };
    if (search) {
        params.search = search;
    }
    return apiRequest('/wp-json/wc/v3/products', { auth, method: 'GET', params });
}

export async function getCategories(auth: WpConfig): Promise<WooCategory[]> {
    const params: Record<string, string> = {
        per_page: '100', // Fetch up to 100 categories
    };
    return apiRequest('/wp-json/wc/v3/products/categories', { auth, method: 'GET', params });
}


export async function getSativarClients(auth: WpConfig, search: string = ''): Promise<SativarClient[]> {
    const params: Record<string, string> = {
        per_page: '50',
    };
    if (search) {
        params.search = search;
    }
    return apiRequest('/wp-json/sativar/v1/clientes', { auth, method: 'GET', params });
}