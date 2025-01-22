// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { UserWithProfile } from '../types/prisma';

interface JwtPayload {
  userId: number;
}

declare module 'express' {
  interface Request {
    user?: UserWithProfile;
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'No token provided'
      });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JwtPayload;

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
        message: 'Invalid token'
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};