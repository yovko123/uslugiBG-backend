// src/types/prisma.ts

// Basic type for User
export interface User {
    id: number;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone: string;
    userType: 'provider' | 'customer';
    createdAt: Date;
    updatedAt: Date;
  }
  
  // Type for ProviderProfile
  export interface ProviderProfile {
    id: number;
    userId: number;
    companyName?: string | null;
    description?: string | null;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    rating?: number | null;
    isVerified: boolean;
    documentsVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface ServiceLocation {
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

  export interface ServiceFormData {
      title: string;
      description: string;
      categoryId: number;
      price: number;
      priceType: PriceType;
      currency: Currency;
      isActive: boolean;
      location: ServiceLocation;
      images: File[];
  }

  export interface Service {
    id: number;
    providerId: number;
    title: string;
    description: string;
    categoryId: number;
    price: number;
    priceType: PriceType;
    currency: Currency;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
}

export interface ServiceImage {
  id: number;
  serviceId: number;
  imageUrl: string;
  isMain: boolean;
  createdAt: Date;
}

  export interface ServiceCategory {
    id: number;
    name: string;
    description?: string | null;
  }
  
  export enum PriceType {
    FIXED = 'FIXED',
    HOURLY = 'HOURLY'
  }
  
  export enum Currency {
    BGN = 'BGN',
    EUR = 'EUR'
  }
  
  
  // Extended type for User with ProviderProfile
  export interface UserWithProfile extends User {
    providerProfile?: ProviderProfile | null;
    bookingsAsCustomer?: Array<{
      id: number;
      serviceId: number;
      bookingDate: Date;
      status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
      totalPrice: number;
    }>;
    blogPosts?: Array<{
      id: number;
      title: string;
      content: string;
      status: 'draft' | 'published' | 'archived';
      publishedAt?: Date | null;
    }>;
  }