
import type { WpConfig, WooProduct, WooCategory, SativarUser } from '../types.ts';

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
  const isUserEndpoint = endpoint.includes('/sativar/v1/clientes');
  
  const finalFetchOptions: RequestInit = {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  };

  const finalParams = new URLSearchParams();
  if (params) {
    for (const key in params) {
        const value = params[key];
        if (typeof value === 'object' && value !== null) {
            for (const subKey in value) {
                 finalParams.append(`${key}[${subKey}]`, value[subKey]);
            }
        } else if (value !== undefined) {
            finalParams.append(key, String(value));
        }
    }
  }

  if (isUserEndpoint) {
    // Custom WP REST endpoints often work better with Basic Auth, while standard WC endpoints work well with query params.
    // This provides the keys via the Authorization header for the user endpoint.
    const basicAuth = btoa(`${auth.consumerKey}:${auth.consumerSecret}`);
    (finalFetchOptions.headers as Record<string, string>)['Authorization'] = `Basic ${basicAuth}`;
  } else {
    // For all other endpoints (like WooCommerce products), we continue using query parameters.
    finalParams.append('consumer_key', auth.consumerKey);
    finalParams.append('consumer_secret', auth.consumerSecret);
  }

  url.search = finalParams.toString();
  
  const response = await fetch(url.toString(), finalFetchOptions);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("API Error Response:", errorBody);
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export interface ApiStatus {
  wooCommerce: 'success' | 'error' | 'untested';
  sativarUsers: 'success' | 'error' | 'untested';
}

export async function checkApiStatus(auth: WpConfig): Promise<ApiStatus> {
  const status: ApiStatus = {
    wooCommerce: 'untested',
    sativarUsers: 'untested',
  };

  if (!auth.url || !auth.consumerKey || !auth.consumerSecret) {
    return { wooCommerce: 'error', sativarUsers: 'error' };
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
    status.sativarUsers = 'success';
  } catch (e) {
    console.error("Sativar Users API check failed:", e);
    status.sativarUsers = 'error';
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


export async function getSativarUsers(auth: WpConfig, search: string = ''): Promise<SativarUser[]> {
    const params: Record<string, string> = {
        per_page: '50',
    };
    if (search) {
        params.search = search;
    }
    return apiRequest('/wp-json/sativar/v1/clientes', { auth, method: 'GET', params });
}