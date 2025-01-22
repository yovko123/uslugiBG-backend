// src/controllers/category/categoryController.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';

// Get all categories
export const getCategories = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// Get single category
export const getCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { 
        id: parseInt(id) 
      },
      include: {
        services: true
      }
    });

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found'
      });
      return;
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// Create category (admin only)
export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, parentId } = req.body;

    const existingCategory = await prisma.category.findUnique({
      where: { name }
    });

    if (existingCategory) {
      res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
      return;
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
        parentId: parentId ? parseInt(parentId) : null
      }
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// Update category (admin only)
export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, parentId } = req.body;

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingCategory) {
      res.status(404).json({
        success: false,
        message: 'Category not found'
      });
      return;
    }

    // Check if new name already exists (if name is being updated)
    if (name && name !== existingCategory.name) {
      const nameExists = await prisma.category.findUnique({
        where: { name }
      });

      if (nameExists) {
        res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
        return;
      }
    }

    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        parentId: parentId ? parseInt(parentId) : null
      }
    });

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// Delete category (admin only)
export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if category has services
    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
      include: {
        services: {
          select: { id: true }
        }
      }
    });

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found'
      });
      return;
    }

    if (category.services.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete category with existing services'
      });
      return;
    }

    await prisma.category.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};