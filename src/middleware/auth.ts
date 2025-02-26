// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { UserWithProfile } from '../types/prisma';

interface JwtPayload {
  userId: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserWithProfile;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Invalid authorization format'
      });
      return;
    }
    
    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'No token provided'
      });
      return;
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';

    try {
      // Log the token and secret being used (only in test mode)
      if (process.env.NODE_ENV === 'test') {
        console.log('Verifying token with secret:', secret.substring(0, 5) + '...');
      }
      
      const decoded = jwt.verify(token, secret) as JwtPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          providerProfile: true,
          bookingsAsCustomer: {
            select: {
              id: true,
              serviceId: true,
              bookingDate: true,
              status: true,
              totalPrice: true
            }
          },
          blogPosts: {
            select: {
              id: true,
              title: true,
              content: true,
              status: true,
              publishedAt: true
            }
          }
        }
      });

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      req.user = user;
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication process failed'
    });
  }
};