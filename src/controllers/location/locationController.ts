import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';
import { PrismaClient } from '@prisma/client';

// Create specific clients for each model
const countryClient = prisma as unknown as { country: PrismaClient['country'] };
const stateClient = prisma as unknown as { state: PrismaClient['state'] };
const cityClient = prisma as unknown as { city: PrismaClient['city'] };

// Get all countries
export const getCountries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { language = 'en' } = req.query; // Default to English
    
    const countries = await countryClient.country.findMany({
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        code: true,
        // Select the appropriate name based on language
        name: language === 'bg' ? false : true,
        nameBg: language === 'bg' ? true : false
      }
    });
    
    // Transform the result to use the correct name field based on language
    const formattedCountries = countries.map((country: { 
      id: number; 
      name: string | null; 
      nameBg: string | null; 
      code: string 
    }) => ({
      id: country.id,
      name: language === 'bg' ? country.nameBg : country.name,
      code: country.code
    }));

    res.json({
      success: true,
      data: formattedCountries
    });
  } catch (error) {
    next(error);
  }
};

// Get states by country ID
export const getStatesByCountry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const countryId = parseInt(req.query.countryId as string);

    if (!countryId || isNaN(countryId)) {
      res.status(400).json({
        success: false,
        message: 'Valid country ID is required'
      });
      return;
    }

    const states = await stateClient.state.findMany({
      where: { countryId },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: states
    });
  } catch (error) {
    next(error);
  }
};

// Get cities by state ID
export const getCitiesByState = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stateId = parseInt(req.query.stateId as string);

    if (!stateId || isNaN(stateId)) {
      res.status(400).json({
        success: false,
        message: 'Valid state ID is required'
      });
      return;
    }

    const cities = await cityClient.city.findMany({
      where: { stateId },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: cities
    });
  } catch (error) {
    next(error);
  }
}; 