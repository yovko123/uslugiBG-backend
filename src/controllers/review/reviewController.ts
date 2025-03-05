// src/controllers/review/reviewController.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';

/**
 * Create a review for a completed booking
 * Includes enhanced eligibility checks to prevent review manipulation
 */
export const createReview = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const { bookingId, rating, comment } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Most of the validation is handled by our middleware
    // The booking object should be available from middleware
    const booking = res.locals.booking || await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      include: {
        service: {
          include: {
            provider: true
          }
        },
        review: true
      }
    });

    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        bookingId: parseInt(bookingId),
        rating,
        comment: comment || null
      },
      include: {
        booking: {
          include: {
            service: {
              include: {
                provider: true
              }
            }
          }
        }
      }
    });

    // Update provider's rating
    const provider = booking.service.provider;
    
    // Get all reviews for this provider's services
    const providerReviews = await prisma.review.findMany({
      where: {
        booking: {
          service: {
            providerId: provider.id
          }
        }
      }
    });
    
    // Calculate new average rating
    const totalRating = providerReviews.reduce((sum, review) => sum + review.rating, 0);
    const avgRating = totalRating / providerReviews.length;
    
    // Update provider's rating
    await prisma.providerProfile.update({
      where: { id: provider.id },
      data: {
        rating: avgRating
      }
    });

    // Check if we need to flag for moderation
    if (res.locals.flagForModeration) {
      // In a real implementation, you'd add this to a moderation queue
      console.warn('Review flagged for moderation:', {
        reviewId: review.id,
        userId,
        providerId: provider.id,
        rating,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      data: review,
      message: 'Review created successfully'
    });
  } catch (error) {
    console.error('Error creating review:', error);
    next(error);
  }
};

/**
 * Get all reviews for a service
 */
export const getServiceReviews = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const { serviceId } = req.params;
    const { page = '1', limit = '10' } = req.query;

    // Validate serviceId
    if (!serviceId) {
      res.status(400).json({
        success: false,
        message: 'Service ID is required'
      });
      return;
    }

    // Parse pagination parameters
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await prisma.review.count({
      where: {
        booking: {
          serviceId: parseInt(serviceId)
        }
      }
    });

    // Get reviews with pagination
    const reviews = await prisma.review.findMany({
      where: {
        booking: {
          serviceId: parseInt(serviceId)
        }
      },
      include: {
        booking: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Error getting service reviews:', error);
    next(error);
  }
};

/**
 * Get all reviews for a provider
 */
export const getProviderReviews = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const { providerId } = req.params;
    const { page = '1', limit = '10' } = req.query;

    // Parse pagination parameters
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await prisma.review.count({
      where: {
        booking: {
          service: {
            providerId: parseInt(providerId)
          }
        }
      }
    });

    // Get reviews with pagination
    const reviews = await prisma.review.findMany({
      where: {
        booking: {
          service: {
            providerId: parseInt(providerId)
          }
        }
      },
      include: {
        booking: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            service: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Error getting provider reviews:', error);
    next(error);
  }
};

export default {
  createReview,
  getServiceReviews,
  getProviderReviews
};