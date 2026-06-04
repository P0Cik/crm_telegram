import axios from 'axios';
import telegram from '../telegram';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface AuthResponse {
  success: boolean;
  access: string;
  refresh: string;
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    telegram_id: number;
    role: string;
  };
}

class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Загружаем токены из localStorage при инициализации
    this.loadTokens();
  }

  private loadTokens() {
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  private saveTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }

  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async authenticate(): Promise<AuthResponse | null> {
    try {
      const initData = telegram.getInitData();

      if (!initData) {
        console.error('No Telegram initData available');
        return null;
      }

      const response = await axios.post<AuthResponse>(
        `${API_BASE_URL}/auth/telegram/`,
        { initData },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        this.saveTokens(response.data.access, response.data.refresh);
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  logout() {
    this.clearTokens();
  }
}

export const authService = new AuthService();
export default authService;
