import { v4 as uuidv4 } from 'uuid';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

class ToastService {
  private toasts: Toast[] = [];
  private listeners: Array<(toasts: Toast[]) => void> = [];

  subscribe(listener: (toasts: Toast[]) => void) {
    this.listeners.push(listener);
    // Send current toasts to the new listener (only if there are toasts)
    if (this.toasts.length > 0) {
      listener([...this.toasts]);
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  show(type: ToastType, message: string, duration?: number) {
    const toast: Toast = {
      id: uuidv4(),
      type,
      message,
      duration
    };

    this.toasts = [...this.toasts, toast];
    this.notifyListeners();

    // Auto remove toast after duration
    setTimeout(() => {
      this.remove(toast.id);
    }, duration || 5000);
  }

  success(message: string, duration?: number) {
    this.show('success', message, duration);
  }

  error(message: string, duration?: number) {
    this.show('error', message, duration);
  }

  warning(message: string, duration?: number) {
    this.show('warning', message, duration);
  }

  info(message: string, duration?: number) {
    this.show('info', message, duration);
  }

  remove(id: string) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.notifyListeners();
  }

  clear() {
    this.toasts = [];
    this.notifyListeners();
  }
}

export const toastService = new ToastService();