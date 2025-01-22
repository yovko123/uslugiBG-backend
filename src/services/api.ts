// src/services/api.ts
import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { storage } from '../utils/storage';

// Base interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

// User types
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  userType: 'provider' | 'customer';
  providerProfile?: ProviderProfile;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderProfile {
  id: number;
  userId: number;
  companyName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  userType: 'provider' | 'customer';
  companyName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'passwordHash'>;
}

const TOKEN_KEY = 'auth_token';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3005/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = storage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Keep the original response structure but add our success flag
    return {
      ...response,
      data: {
        success: true,
        data: response.data
      }
    };
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear token on authentication error
      storage.removeItem(TOKEN_KEY);
    }
    return Promise.reject({
      success: false,
      message: error.response?.data?.message || 'An error occurred',
      data: error.response?.data
    });
  }
);

// Auth endpoints
export const authApi = {
  login: async (credentials: LoginCredentials) => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    if (response.data.data?.token) {
      storage.setItem(TOKEN_KEY, response.data.data.token);
    }
    return response.data;
  },
  
  register: async (data: RegisterData) => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    if (response.data.data?.token) {
      storage.setItem(TOKEN_KEY, response.data.data.token);
    }
    return response.data;
  },
  
  logout: () => {
    storage.removeItem(TOKEN_KEY);
    return Promise.resolve({ success: true });
  },

  isAuthenticated: (): boolean => {
    return !!storage.getItem(TOKEN_KEY);
  }
};

// User endpoints
export const userApi = {
  getCurrentUser: () => 
    api.get<ApiResponse<User>>('/users/me'),
  
  updateProfile: (data: Partial<User>) =>
    api.patch<ApiResponse<User>>('/users/me', data),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<ApiResponse>('/users/change-password', {
      currentPassword,
      newPassword
    })
};

// Provider-specific endpoints
export const providerApi = {
  createProfile: (data: Omit<ProviderProfile, 'id' | 'userId'>) =>
    api.post<ApiResponse<ProviderProfile>>('/providers/profile', data),
    
  updateProfile: (data: Partial<ProviderProfile>) =>
    api.patch<ApiResponse<ProviderProfile>>('/providers/profile', data),
    
  getProfile: () =>
    api.get<ApiResponse<ProviderProfile>>('/providers/profile')
};

export default api;