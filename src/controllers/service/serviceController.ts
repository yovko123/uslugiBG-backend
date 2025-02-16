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
        id: Number(req.params.id)
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

    // Parse request data
    const serviceData = req.body.data ? JSON.parse(req.body.data) : req.body;
    const keepImageIds = req.body.keepImageIds ? JSON.parse(req.body.keepImageIds) : [];

    // Validate service ownership
    const existingService = await prisma.service.findUnique({
      where: { id: parseInt(id) },
      include: {
        provider: { include: { user: true } },
        serviceImages: true
      }
    });

    if (!existingService) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    if (existingService.provider.user.id !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    // Handle image updates
    try {
      // Delete unwanted images
      await prisma.serviceImage.deleteMany({
        where: {
          serviceId: existingService.id,
          NOT: { id: { in: keepImageIds } }
        }
      });

      // Add new images
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const imageUrl = await storage.saveFile(file.buffer, file.originalname);
          await prisma.serviceImage.create({
            data: {
              serviceId: existingService.id,
              imageUrl,
              isMain: existingService.serviceImages.length === 0
            }
          });
        }
      }
    } catch (error) {
      console.error('Image update error:', error);
      res.status(500).json({ success: false, message: 'Image update failed' });
      return;
    }
    

    // Update service data
    const updatedService = await prisma.service.update({
      where: { id: existingService.id },
      data: {
        title: serviceData.title,
        description: serviceData.description,
        categoryId: parseInt(serviceData.categoryId),
        price: parseFloat(serviceData.price),
        priceType: serviceData.priceType.toUpperCase(),
        address: serviceData.address,
        city: serviceData.city,
        state: serviceData.state,
        postalCode: serviceData.postalCode,
        isActive: serviceData.isActive
      },
      include: {
        serviceImages: true,
        provider: { include: { user: true } },
        category: true
      }
    });

    res.json({
      success: true,
      data: updatedService,
      message: 'Service updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteServiceImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const imageId = Number(req.params.imageId);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Verify image ownership
    const image = await prisma.serviceImage.findUnique({
      where: { id: imageId },
      include: {
        service: {
          include: {
            provider: {
              include: { user: true }
            }
          }
        }
      }
    });

    if (!image || image.service.provider.user.id !== userId) {
      res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this image' 
      });
      return;
    }

    await storage.deleteFile(image.imageUrl);
    await prisma.serviceImage.delete({
      where: { id: imageId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete image' 
    });
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