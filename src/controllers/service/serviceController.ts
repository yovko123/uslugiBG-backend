// src/controllers/service/serviceController.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';
import { storage } from '../../config/storage.config';
import { ServiceRequest } from '../../types/middleware';
import { PriceType, Currency, Prisma, BookingType } from '@prisma/client';

export const createService = async (req: ServiceRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Validate required fields
    const {
      title,
      description,
      categoryId,
      price,
      priceType,
      bookingType
    } = req.body;

    if (!title || !description || !categoryId || !price || !priceType) {
      res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
      return;
    }

    // Validate numeric values
    const parsedCategoryId = parseInt(categoryId);
    const parsedPrice = parseFloat(price);
    
    if (isNaN(parsedCategoryId) || parsedCategoryId <= 0) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid category ID' 
      });
      return;
    }
    
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid price' 
      });
      return;
    }

    // Validate price type
    const validPriceTypes = ['FIXED', 'HOURLY'];
    if (!validPriceTypes.includes(priceType.toUpperCase())) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid price type' 
      });
      return;
    }

    // Validate booking type
    const validBookingTypes = ['DIRECT', 'INQUIRY'];
    const normalizedBookingType = bookingType?.toUpperCase() || 'DIRECT';
    if (!validBookingTypes.includes(normalizedBookingType)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid booking type' 
      });
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
        categoryId: parsedCategoryId,
        price: parsedPrice,
        priceType: priceType.toUpperCase() as PriceType,
        bookingType: normalizedBookingType as BookingType,
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
    const { 
      categoryId, 
      city, 
      priceMin, 
      priceMax, 
      page = '1', 
      limit = '10',
      sortBy = 'newest'
    } = req.query;

    // Validate and sanitize numeric inputs
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10)); // Cap at 50
    const skip = (pageNum - 1) * limitNum;

    // Build where clause safely
    const where: Prisma.ServiceWhereInput = {
      isActive: true
    };

    // Safely add categoryId filter if provided
    if (categoryId) {
      const categoryIdNum = parseInt(categoryId as string);
      if (!isNaN(categoryIdNum) && categoryIdNum > 0) {
        where.categoryId = categoryIdNum;
      }
    }

    // Safely add price range filters
    if (priceMin) {
      const priceMinNum = parseFloat(priceMin as string);
      if (!isNaN(priceMinNum) && priceMinNum >= 0) {
        where.price = {
          ...(where.price as object || {}),
          gte: priceMinNum
        };
      }
    }

    if (priceMax) {
      const priceMaxNum = parseFloat(priceMax as string);
      if (!isNaN(priceMaxNum) && priceMaxNum > 0) {
        where.price = {
          ...(where.price as object || {}),
          lte: priceMaxNum
        };
      }
    }

    // Safely add city filter if provided
    if (city && typeof city === 'string') {
      where.provider = {
        city: {
          contains: city,
          mode: 'insensitive'
        }
      };
    }

    // Determine sort order safely
    let orderBy: Prisma.ServiceOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'price-low':
        orderBy = { price: 'asc' };
        break;
      case 'price-high':
        orderBy = { price: 'desc' };
        break;
      case 'rating':
        orderBy = { createdAt: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Execute count query first for pagination
    const totalCount = await prisma.service.count({ where });

    // Execute main query with pagination
    const services = await prisma.service.findMany({
      where,
      include: {
        provider: {
          include: { user: true }
        },
        category: true,
        serviceImages: true
      },
      orderBy,
      skip,
      take: limitNum
    });

    res.json({
      success: true,
      data: services,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum)
      }
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

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const provider = await prisma.providerProfile.findUnique({
      where: { userId: Number(userId) }
    });

    if (!provider) {
      res.status(404).json({ success: false, message: 'Provider profile not found' });
      return;
    }

    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 6;
    const skip = (page - 1) * limit;

    // Setup ordering based on sortBy
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

    // Get the total count for pagination
    const totalCount = await prisma.service.count({
      where: {
        providerId: provider.id,
        isActive
      }
    });

    // Fetch only the required page
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
      orderBy,
      skip,
      take: limit
    });

    res.json({
      success: true,
      data: services,
      total: totalCount
    });
  } catch (error) {
    next(error);
  }
};

export const updateService = async (
  req: ServiceRequest, 
  res: Response, 
  next: NextFunction
): Promise<void | Response> => {
  try {
    // Check authentication and ownership
    const userId = req.user?.id;
    const serviceId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    // Check if service exists and belongs to this provider
    const provider = await prisma.providerProfile.findUnique({
      where: { userId }
    });

    if (!provider) {
      return res.status(404).json({ 
        success: false, 
        message: 'Provider profile not found' 
      });
    }

    const existingService = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { providerId: true }
    });

    if (!existingService) {
      return res.status(404).json({ 
        success: false, 
        message: 'Service not found' 
      });
    }

    if (existingService.providerId !== provider.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to update this service' 
      });
    }

    // Extract and validate fields
    const {
      title,
      description,
      categoryId,
      price,
      priceType,
      bookingType,
      address,
      city,
      state,
      postalCode
    } = req.body;

    // Build update data object
    const updateData: any = {};

    // Update title if provided
    if (title !== undefined) {
      updateData.title = title;
    }

    // Update description if provided
    if (description !== undefined) {
      updateData.description = description;
    }

    // Update categoryId if provided and valid
    if (categoryId !== undefined) {
      const parsedCategoryId = parseInt(categoryId);
      if (isNaN(parsedCategoryId) || parsedCategoryId <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid category ID' 
        });
      }
      updateData.categoryId = parsedCategoryId;
    }

    // Update price if provided and valid
    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid price' 
        });
      }
      updateData.price = parsedPrice;
    }

    // Update priceType if provided and valid
    if (priceType !== undefined) {
      const validPriceTypes = ['FIXED', 'HOURLY'];
      if (!validPriceTypes.includes(priceType.toUpperCase())) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid price type' 
        });
      }
      updateData.priceType = priceType.toUpperCase() as PriceType;
    }
    
    // Update bookingType if provided and valid
    if (bookingType !== undefined) {
      const validBookingTypes = ['DIRECT', 'INQUIRY'];
      if (!validBookingTypes.includes(bookingType.toUpperCase())) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid booking type' 
        });
      }
      updateData.bookingType = bookingType.toUpperCase() as BookingType;
    }

    // Update location fields if provided
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (postalCode !== undefined) updateData.postalCode = postalCode;

    // Update service
    const updatedService = await prisma.service.update({
      where: { id: serviceId },
      data: updateData,
      include: {
        serviceImages: true,
        provider: true
      }
    });

    return res.json({
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

    // Delete from storage and database
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