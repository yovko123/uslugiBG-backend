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