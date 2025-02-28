import express from 'express';
import { getCountries, getStatesByCountry, getCitiesByState } from '../controllers/location/locationController';

const router = express.Router();

// Location routes
router.get('/countries', getCountries);
router.get('/states', getStatesByCountry);
router.get('/cities', getCitiesByState);

export default router; 