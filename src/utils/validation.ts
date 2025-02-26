// src/utils/validation.ts
import Joi from 'joi';

export const validateRegistration = (data: any) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    phone: Joi.string().required(),
    userType: Joi.string().valid('provider', 'customer').required()
  });

  return schema.validate(data);
};

export const validateLogin = (data: any) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  return schema.validate(data);
};

export const validateReview = (data: any) => {
  const schema = Joi.object({
    bookingId: Joi.number().required(),
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().allow(null, '')
  });

  return schema.validate(data);
};

export const validateService = (data: any) => {
  const schema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    categoryId: Joi.string().required(),
    pricePerHour: Joi.number().positive().required(),
    isActive: Joi.boolean().default(true)
  });

  return schema.validate(data);
};

export const validateProviderProfile = (data: any) => {
  const schema = Joi.object({
    companyName: Joi.string().allow(null, ''),
    description: Joi.string().allow(null, ''),
    address: Joi.string().allow(null, ''),
    city: Joi.string().allow(null, ''),
    postalCode: Joi.string().allow(null, '')
  });

  return schema.validate(data);
};

export const validateBooking = (data: any) => {
  const schema = Joi.object({
    serviceId: Joi.number().required(),
    bookingDate: Joi.date().greater('now').required(),
    totalPrice: Joi.number().positive().required(),
    status: Joi.string().valid('pending', 'confirmed', 'completed', 'cancelled').default('pending')
  });

  return schema.validate(data);
};

export const validateBlogPost = (data: any) => {
  const schema = Joi.object({
    title: Joi.string().required(),
    content: Joi.string().required(),
    status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
    publishedAt: Joi.date().allow(null)
  });

  return schema.validate(data);
};

/**
 * Validates password complexity requirements
 * 
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 * 
 * @param password Password to validate
 * @returns Object with success flag and error messages
 */
export const validatePasswordComplexity = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  // Check minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Check for digits
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  
  // Check for special characters
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};