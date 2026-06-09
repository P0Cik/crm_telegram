import axios from 'axios';
import telegram from '../telegram';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface AuthUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  telegram_id: number;
  role: string;
}

interface AuthResponse {
  success: boolean;
  access: string;
  refresh: string;
  user: AuthUser;
}

class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private userData: AuthUser | null = null;

  constructor() {
    // Загружаем токены из localStorage при инициализации
    this.loadTokens();
    this.loadUserData();
  }

  private loadTokens() {
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  private loadUserData() {
    const raw = localStorage.getItem('user_data');
    if (raw) {
      try {
        this.userData = JSON.parse(raw);
      } catch {
        this.userData = null;
      }
    }
  }

  private saveTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }

  private saveUserData(user: AuthUser) {
    this.userData = user;
    localStorage.setItem('user_data', JSON.stringify(user));
  }

  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.userData = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
  }

  async authenticate(): Promise<AuthResponse | null> {
    try {
      let initData = telegram.getInitData();

      if (!initData) {
        // Mock initData for local browser testing
        initData = "user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Browser%22%2C%22last_name%22%3A%22Tester%22%2C%22username%22%3A%22browsertester%22%7D";
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
        this.saveUserData(response.data.user);
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

  getUserRole(): string | null {
    return this.userData?.role || null;
  }

  getUserData(): AuthUser | null {
    return this.userData;
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

