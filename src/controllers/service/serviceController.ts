// src/controllers/service/serviceController.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';
import { storage } from '../../config/storage.config';
import { ServiceRequest } from '../../types/middleware';
import { PriceType, Currency, Prisma } from '@prisma/client';

export const createService = async (req: ServiceRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const provider = await prisma.providerProfile.findUnique({
      where: { userId }
    });

    if (!provider) {
      res.status(403).json({ success: false, message: 'Only providers can create services' });
      return;
    }

    const {
      title,
      description,
      categoryId,
      price,
      priceType,
      address,
      city,
      state,
      postalCode
    } = req.body;

    // First create the service
    const service = await prisma.service.create({
      data: {
        providerId: provider.id,
        title,
        description,
        categoryId: parseInt(categoryId),
        price: parseFloat(price),
        priceType: priceType.toUpperCase() as PriceType,
        currency: Currency.BGN,
        address,
        city,
        state,
        postalCode,
        isActive: true
      }
    });

    // Handle image uploads
    if (req.files && Array.isArray(req.files)) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const imageUrl = await storage.saveFile(file.buffer, file.originalname);
        await prisma.serviceImage.create({
          data: {
            serviceId: service.id,
            imageUrl,
            isMain: i === 0
          }
        });
      }
    }

    // Fetch the complete service with relations
    const completeService = await prisma.service.findUnique({
      where: { id: service.id },
      include: {
        provider: {
          include: {
            user: true
          }
        },
        category: true,
        bookings: true,
        serviceImages: true
      }
    });

    res.status(201).json({
      success: true,
      data: completeService
    });
  } catch (error) {
    next(error);
  }
};

export const getServices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { categoryId, city, priceMin, priceMax } = req.query;
    
    const where = {
      isActive: true,
      ...(categoryId && { categoryId: parseInt(categoryId as string) }),
      ...(city && { city: city as string }),
      ...(priceMin || priceMax ? {
        price: {
          ...(priceMin && { gte: parseFloat(priceMin as string) }),
          ...(priceMax && { lte: parseFloat(priceMax as string) })
        }
      } : {})
    };

    const services = await prisma.service.findMany({
      where,
      include: {
        provider: {
          include: {
            user: true
          }
        },
        category: true,
        bookings: true,
        serviceImages: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: services
    });
  } catch (error) {
    next(error);
  }
};

export const getService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const serviceId = Number(req.params.id);

    //if (!serviceId || isNaN(serviceId)) {
    if (!Number.isSafeInteger(serviceId) || serviceId < 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid service ID'
      });
      return;
    }

    const service = await prisma.service.findUnique({
      where: {
        id: serviceId
      },
      include: {
        provider: {
          include: {
            user: true
          }
        },
        category: true,
        bookings: true,
        serviceImages: true
      }
    });

    if (!service) {
      res.status(404).json({
        success: false,
        message: 'Service not found'
      });
      return;
    }

    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Error in getService:', error);
    next(error);
  }
};

export const getProviderServices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const isActive = req.query.isActive === 'true';
    const sortBy = req.query.sortBy as string;

      // Handle sort parameter
      const orderBy: Prisma.ServiceOrderByWithRelationInput[] = [];
    
      switch (sortBy) {
        case 'newest':
          orderBy.push({ createdAt: 'desc' });
          break;
        case 'oldest':
          orderBy.push({ createdAt: 'asc' });
          break;
        case 'a-z':
          orderBy.push({ title: 'asc' });
          break;
        case 'z-a':
          orderBy.push({ title: 'desc' });
          break;
        default:
          orderBy.push({ createdAt: 'desc' });
      }
      
      // Add secondary sorting for alphabetical
      if (['a-z', 'z-a'].includes(sortBy)) {
        orderBy.push({ createdAt: 'desc' });
      }
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const provider = await prisma.providerProfile.findUnique({
      where: { userId: Number(userId) }
    });

    if (!provider) {
      res.status(404).json({
        success: false,
        message: 'Provider profile not found'
      });
      return;
    }

    const services = await prisma.service.findMany({
      where: {
        providerId: provider.id,
        isActive
      },
      include: {
        provider: {
          include: { user: true }
        },
        category: true,
        serviceImages: true,
        bookings: true
      },
      orderBy
    });

    res.json({
      success: true,
      data: services
    });
  } catch (error) {
    next(error);
  }
};

export const updateService = async (req: ServiceRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existingService = await prisma.service.findUnique({
      where: { id: parseInt(id) },
      include: {
        provider: {
          include: {
            user: true
          }
        }
      }
    });

    if (!existingService) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    if (existingService.provider.userId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized to update this service' });
      return;
    }

    const {
      title,
      description,
      categoryId,
      price,
      priceType,
      address,
      city,
      state,
      postalCode,
      isActive
    } = req.body;

    // Update the service
    const updatedService = await prisma.service.update({
      where: { id: parseInt(id) },
      data: {
        title,
        description,
        categoryId: parseInt(categoryId),
        price: parseFloat(price),
        priceType: priceType.toUpperCase() as PriceType,
        address,
        city,
        state,
        postalCode,
        isActive: isActive ?? true
      },
      include: {
        provider: {
          include: {
            user: true
          }
        },
        category: true,
        bookings: true,
        serviceImages: true
      }
    });

    // Handle image updates if new files are provided
    if (req.files && Array.isArray(req.files)) {
      // Delete existing images
      const existingImages = await prisma.serviceImage.findMany({
        where: { serviceId: parseInt(id) }
      });

      for (const image of existingImages) {
        await storage.deleteFile(image.imageUrl);
        await prisma.serviceImage.delete({
          where: { id: image.id }
        });
      }

      // Upload new images
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const imageUrl = await storage.saveFile(file.buffer, file.originalname);
        await prisma.serviceImage.create({
          data: {
            serviceId: parseInt(id),
            imageUrl,
            isMain: i === 0
          }
        });
      }
    }

    res.json({
      success: true,
      data: updatedService
    });
  } catch (error) {
    next(error);
  }
};

export const deleteService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const service = await prisma.service.findUnique({
      where: { id: parseInt(id) },
      include: {
        provider: {
          include: {
            user: true
          }
        },
        serviceImages: true
      }
    });

    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    if (service.provider.userId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized to delete this service' });
      return;
    }

    // Delete associated images from storage
    for (const image of service.serviceImages) {
      await storage.deleteFile(image.imageUrl);
    }

    // Delete the service (this will cascade delete the images in the database)
    await prisma.service.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};