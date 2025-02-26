// src/routes/auth.ts
import { Router } from 'express';
import { register, login, refreshToken } from '../controllers/auth/authController';

const router = Router();

// Add debug middleware that actually uses req and res
router.use((req, _res, next) => {
  console.log(`Auth Route accessed: ${req.method} ${req.url}`);
  console.log('Request body:', req.body);
  next();
});

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/refresh', refreshToken); // Add this route to support both endpoints

export default router;