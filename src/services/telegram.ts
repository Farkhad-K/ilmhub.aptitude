// src/services/telegram.ts
export type TelegramUser = {
  id?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
};

declare global {
  interface Window {
    Telegram?: any;
    TelegramWebApp?: {
      ready: () => Promise<void>;
      expand: () => void;
      close: () => void;
    };
  }
}

export const telegram = {
  async ready() {
    if (window.TelegramWebApp?.ready) {
      await window.TelegramWebApp.ready();
    } else if (window.Telegram?.WebApp?.ready) {
      // fallback
      window.Telegram.WebApp.ready();
    }
  },

  expand() {
    window.TelegramWebApp?.expand?.();
    window.Telegram?.WebApp?.expand?.();
  },

  close() {
    window.TelegramWebApp?.close?.();
    window.Telegram?.WebApp?.close?.();
  },

  async isMiniApp(): Promise<boolean> {
    try {
      const webapp = window.Telegram?.WebApp;
      if (!webapp) return false;
      // some Telegram implementations provide initData or initDataUnsafe
      const initData = webapp.initData || webapp.initDataUnsafe;
      if (!initData) return false;
      if (typeof initData === 'string') return initData.length > 0;
      if (typeof initData === 'object') return Object.keys(initData).length > 0;
      return false;
    } catch {
      return false;
    }
  },

  async getUser(): Promise<TelegramUser | {}> {
    try {
      const webapp = window.Telegram?.WebApp;
      const unsafe = webapp?.initDataUnsafe;
      if (unsafe && unsafe.user) {
        return unsafe.user as TelegramUser;
      }
    } catch {
      // ignore
    }
    return {};
  }
};
