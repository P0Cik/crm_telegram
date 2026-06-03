// Telegram WebApp SDK типы
interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    auth_date: number;
    hash: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  BackButton: {
    isVisible: boolean;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    show(): void;
    hide(): void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText(text: string): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    show(): void;
    hide(): void;
    enable(): void;
    disable(): void;
    showProgress(leaveActive?: boolean): void;
    hideProgress(): void;
    setParams(params: {
      text?: string;
      color?: string;
      text_color?: string;
      is_active?: boolean;
      is_visible?: boolean;
    }): void;
  };
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  ready(): void;
  expand(): void;
  close(): void;
  sendData(data: string): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  openTelegramLink(url: string): void;
  openInvoice(url: string, callback?: (status: string) => void): void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

// Утилиты для работы с Telegram WebApp
export const telegram = {
  // Получить WebApp объект
  getWebApp(): TelegramWebApp | null {
    return window.Telegram?.WebApp || null;
  },

  // Проверить, запущено ли приложение в Telegram
  isInTelegram(): boolean {
    return !!window.Telegram?.WebApp;
  },

  // Получить данные пользователя
  getUser() {
    const webApp = this.getWebApp();
    return webApp?.initDataUnsafe?.user || null;
  },

  // Получить ID пользователя
  getUserId(): number | null {
    return this.getUser()?.id || null;
  },

  // Получить username пользователя
  getUsername(): string | null {
    return this.getUser()?.username || null;
  },

  // Инициализация приложения
  init() {
    const webApp = this.getWebApp();
    if (webApp) {
      webApp.ready();
      webApp.expand();

      // Применить тему Telegram
      if (webApp.colorScheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    }
  },

  // Показать главную кнопку
  showMainButton(text: string, onClick: () => void) {
    const webApp = this.getWebApp();
    if (webApp) {
      webApp.MainButton.setText(text);
      webApp.MainButton.onClick(onClick);
      webApp.MainButton.show();
    }
  },

  // Скрыть главную кнопку
  hideMainButton() {
    const webApp = this.getWebApp();
    if (webApp) {
      webApp.MainButton.hide();
    }
  },

  // Показать кнопку "Назад"
  showBackButton(onClick: () => void) {
    const webApp = this.getWebApp();
    if (webApp) {
      webApp.BackButton.onClick(onClick);
      webApp.BackButton.show();
    }
  },

  // Скрыть кнопку "Назад"
  hideBackButton() {
    const webApp = this.getWebApp();
    if (webApp) {
      webApp.BackButton.hide();
    }
  },

  // Тактильная обратная связь
  hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'medium') {
    const webApp = this.getWebApp();
    if (webApp) {
      webApp.HapticFeedback.impactOccurred(type);
    }
  },

  // Уведомление
  notification(type: 'error' | 'success' | 'warning') {
    const webApp = this.getWebApp();
    if (webApp) {
      webApp.HapticFeedback.notificationOccurred(type);
    }
  },

  // Закрыть Mini App
  close() {
    const webApp = this.getWebApp();
    if (webApp) {
      webApp.close();
    }
  },

  // Открыть ссылку
  openLink(url: string) {
    const webApp = this.getWebApp();
    if (webApp) {
      webApp.openLink(url);
    }
  },

  // Получить данные инициализации (для отправки на backend)
  getInitData(): string {
    const webApp = this.getWebApp();
    return webApp?.initData || '';
  },
};

export default telegram;
