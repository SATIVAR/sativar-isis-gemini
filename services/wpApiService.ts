// This service has been deprecated and its functionality removed as part of the
// migration away from the WordPress/WooCommerce API dependency.

export interface ApiStatus {
  sativarSeishat: 'success' | 'error' | 'untested';
  sativarUsers: 'success' | 'error' | 'untested';
}

export async function checkApiStatus(auth: any): Promise<ApiStatus> {
  // Return a default status indicating the service is no longer active.
  return { sativarSeishat: 'untested', sativarUsers: 'untested' };
}

export async function getProducts(auth: any, search: string = ''): Promise<any[]> {
    return [];
}

export async function getCategories(auth: any): Promise<any[]> {
    return [];
}

export async function getSativarUsers(auth: any, search: string = ''): Promise<any[]> {
    return [];
}
