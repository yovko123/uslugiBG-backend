// src/services/serviceApi.ts
import api, { ApiResponse } from './api';
import { Service, ServiceFormData } from '../types/prisma';

interface ServiceParams {
  isActive?: boolean;
  sortBy?: 'newest' | 'oldest' | 'a-z' | 'z-a';
}

export const serviceApi = {
  createService: async (formData: FormData): Promise<ApiResponse<Service>> => {
    return api.post('/services', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getServices: async (params?: {
    categoryId?: string;
    city?: string;
    priceMin?: number;
    priceMax?: number;
  }): Promise<ApiResponse<Service[]>> => {
    return api.get('/services', { params });
  },

  getMyServices: async (params?: ServiceParams): Promise<ApiResponse<Service[]>> => {
    try {
      const response = await api.get('/services/provider', { params });
      return {
        success: true,
        data: response.data,
        message: response.statusText,
      };
    } catch (error) {
      console.error('Error fetching my services:', error);
      throw error;
    }
  },

  // getService: async (id: string | number): Promise<ApiResponse<Service>> => {
  //   if (!id) throw new Error('Service ID is required');
  //   return api.get(`/services/${id}`);
  // },

  updateService: async (id: string | number, formData: FormData): Promise<ApiResponse<Service>> => {
    if (!id) throw new Error('Service ID is required');
    return api.put(`/services/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  deleteService: async (id: string | number): Promise<ApiResponse> => {
    if (!id) throw new Error('Service ID is required');
    return api.delete(`/services/${id}`);
  },
};

export const getService = async (id: string | number): Promise<ApiResponse<Service>> => {
  const parsedId = Number(id);
  if (!Number.isSafeInteger(parsedId) || parsedId < 0) {
    throw new Error('Invalid service ID format');
  }
  return api.get(`/services/${parsedId}`);
};

export default serviceApi;