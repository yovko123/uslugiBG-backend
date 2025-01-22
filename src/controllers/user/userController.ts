// src/controllers/user/userController.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';
import bcrypt from 'bcrypt';

// Get current user profile
export const getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        providerProfile: true
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const { passwordHash, ...userWithoutPassword } = user;
    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const {
        firstName,
        lastName,
        phone,
        bio,
        address,
        country,
        state,
        city,
        postalCode,
        currency,
        language,
        gender,
        dateOfBirth
      } = req.body;
  
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }
  
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          phone,
          bio,
          address,
          country,
          state,
          city,
          postalCode,
          currency,
          language,
          gender,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined
        },
        include: {
          providerProfile: true
        }
      });
  
      const { passwordHash, ...userWithoutPassword } = updatedUser;
      res.json({
        success: true,
        data: userWithoutPassword
      });
    } catch (error) {
      next(error);
    }
  };
  
  export const updateSecuritySettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;
  
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }
  
      // Validate request body
      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
        return;
      }
  
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
  
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }
  
      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
        return;
      }
  
      // Update password
      try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
          where: { id: userId },
          data: {
            passwordHash: hashedPassword,
            lastPasswordChange: new Date()
          }
        });
  
        res.json({
          success: true,
          message: 'Password updated successfully'
        });
      } catch (error) {
        console.error('Password update error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to update password'
        });
      }
    } catch (error) {
      console.error('Security settings error:', error);
      next(error);
    }
  };
  
  export const updateNotificationSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { emailNotifications, smsNotifications, promotionalEmails } = req.body;
  
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }
  
      await prisma.user.update({
        where: { id: userId },
        data: {
          emailNotifications,
          smsNotifications,
          promotionalEmails
        }
      });
  
      res.json({
        success: true,
        message: 'Notification settings updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };
// Upgrade user to provider
export const upgradeToProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { companyName, description } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Check if user already has a provider profile
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { providerProfile: true }
    });

    if (existingUser?.providerProfile) {
      res.status(400).json({
        success: false,
        message: 'User is already a provider'
      });
      return;
    }

    // Update user type and create provider profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        userType: 'provider',
        providerProfile: {
          create: {
            companyName: companyName || null,
            description: description || null,
            isVerified: false,
            documentsVerified: false
          }
        }
      },
      include: {
        providerProfile: true
      }
    });

    const { passwordHash, ...userWithoutPassword } = updatedUser;
    res.json({
      success: true,
      data: {
        user: userWithoutPassword
      }
    });
  } catch (error) {
    console.error('Error upgrading to provider:', error);
    next(error);
  }
};

// Delete user account
export const deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Delete user and all related data
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get user stats
export const getUserStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const stats = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        _count: {
          select: {
            bookingsAsCustomer: true
          }
        },
        providerProfile: {
          select: {
            services: {
              select: {
                _count: {
                  select: {
                    bookings: true
                  }
                }
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        totalBookings: stats?._count.bookingsAsCustomer || 0,
        // Add more stats as needed
      }
    });
  } catch (error) {
    next(error);
  }
};