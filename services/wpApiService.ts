

import type { WpConfig, WooProduct, WooCategory, SativarUser } from '../types.ts';

interface ApiRequestOptions extends RequestInit {
  auth: WpConfig;
  params?: Record<string, string | Record<string, string>>;
}

// --- Helper Functions for Intelligent Search ---

/**
 * Removes all non-digit characters from a string.
 * @param term The string to normalize.
 * @returns A string containing only digits.
 */
const normalizeDigits = (term: string): string => term.replace(/\D/g, '');

/**
 * Heuristically checks if a string is a CPF.
 * A Brazilian CPF has 11 digits. This check is made more specific to avoid
 * incorrectly identifying 11-digit mobile numbers (which also have 11 digits)
 * as CPFs. It does this by rejecting terms that contain phone-specific
 * formatting like parentheses.
 * @param term The search term.
 * @returns True if it's likely a CPF.
 */
const isCPF = (term: string): boolean => {
    const digits = normalizeDigits(term);
    if (digits.length !== 11) {
        return false;
    }
    // If the original term contains parentheses, it's treated as a phone number, not a CPF.
    if (term.includes('(') || term.includes(')')) {
        return false;
    }
    return true;
};

/**
 * Heuristically checks if a string is a Brazilian phone number (including area code).
 * Phone numbers have 10 (landline) or 11 (mobile) digits.
 * @param term The search term.
 * @returns True if it's likely a phone number.
 */
const isPhone = (term: string): boolean => {
    const digits = normalizeDigits(term);
    return digits.length === 10 || digits.length === 11;
};


async function apiRequest<T>(endpoint: string, options: ApiRequestOptions): Promise<T> {
  const { auth, params, ...fetchOptions } = options;

  if (!auth.url) {
    throw new Error('Sativar_WP_API URL de configuração está ausente.');
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
                 finalParams.append(`${key}[${subKey}]`, (value as Record<string,string>)[subKey]);
            }
        } else if (value !== undefined) {
            finalParams.append(key, String(value));
        }
    }
  }

  // Authentication Logic
  if (isUserEndpoint && auth.username && auth.applicationPassword) {
    // For SATIVAR user endpoint, use Basic Auth with Application Password
    const basicAuth = btoa(`${auth.username}:${auth.applicationPassword}`);
    (finalFetchOptions.headers as Record<string, string>)['Authorization'] = `Basic ${basicAuth}`;
  } else {
    // For all other endpoints (assume WooCommerce), use Consumer Key/Secret
    if (!auth.consumerKey || !auth.consumerSecret) {
        throw new Error('WooCommerce Consumer Key e Secret são obrigatórios.');
    }
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

  if (!auth.url) {
    return { wooCommerce: 'error', sativarUsers: 'error' };
  }

  // Test WooCommerce Endpoint
  if (auth.consumerKey && auth.consumerSecret) {
      try {
        await apiRequest('/wp-json/wc/v3/products', { auth, method: 'GET', params: { per_page: '1' } });
        status.wooCommerce = 'success';
      } catch (e) {
        console.error("WooCommerce API check failed:", e);
        status.wooCommerce = 'error';
      }
  } else {
      status.wooCommerce = 'error';
  }

  // Test Sativar Users Endpoint
  if (auth.username && auth.applicationPassword) {
      try {
        await apiRequest('/wp-json/sativar/v1/clientes', { auth, method: 'GET', params: { per_page: '1' } });
        status.sativarUsers = 'success';
      } catch (e) {
        console.error("Sativar Users API check failed:", e);
        status.sativarUsers = 'error';
      }
  } else {
      // If user auth creds are not provided, it's untested, not an error.
      status.sativarUsers = 'untested';
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
    const params: Record<string, any> = {
        per_page: '50',
    };
    
    if (search) {
        const trimmedSearch = search.trim();
        
        // Use intelligent filtering based on input format
        if (isCPF(trimmedSearch)) {
            params.acf_filters = { cpf: normalizeDigits(trimmedSearch) };
        } else if (isPhone(trimmedSearch)) {
            params.acf_filters = { telefone: normalizeDigits(trimmedSearch) };
        } else {
            // Fallback to general search for names, emails, etc.
            params.search = trimmedSearch;
        }
    }
    
    return apiRequest('/wp-json/sativar/v1/clientes', { auth, method: 'GET', params });
}
