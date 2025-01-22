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

// Removed unused parameters
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);

export default router;