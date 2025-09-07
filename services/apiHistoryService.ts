export interface ApiCall {
    id: string;
    timestamp: string; // ISO string
    type: 'prescription_analysis' | 'text_query';
    status: 'success' | 'error';
    details: string; // Filename for prescription, snippet for text query
    error?: string; // Error message if status is 'error'
}

export const API_HISTORY_STORAGE_KEY = 'sativar_isis_api_history';

export const getApiHistory = (): ApiCall[] => {
    try {
        const storedHistory = localStorage.getItem(API_HISTORY_STORAGE_KEY);
        return storedHistory ? JSON.parse(storedHistory) : [];
    } catch (e) {
        console.error("Failed to parse API history from localStorage", e);
        return [];
    }
};

export const addApiCall = (callData: Omit<ApiCall, 'id' | 'timestamp'>): void => {
    try {
        const history = getApiHistory();
        const newCall: ApiCall = {
            ...callData,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
        };
        // Keep the log to a reasonable size, e.g., last 100 calls
        const updatedHistory = [newCall, ...history].slice(0, 100);
        localStorage.setItem(API_HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (e) {
        console.error("Failed to save API call to localStorage", e);
    }
};

export const clearApiHistory = (): void => {
    try {
        localStorage.removeItem(API_HISTORY_STORAGE_KEY);
    } catch (e) {
        console.error("Failed to clear API history from localStorage", e);
    }
};
