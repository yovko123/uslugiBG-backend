// src/routes/user.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getCurrentUser,
  updateProfile,
  upgradeToProvider,
  deleteAccount,
  getUserStats,
  updateSecuritySettings,
  updateNotificationSettings
} from '../controllers/user/userController';

const router = Router();

// Protected routes - require authentication
router.use(authenticateToken);

// Basic user routes
router.get('/me', getCurrentUser);
router.put('/profile', updateProfile);
router.post('/upgrade-to-provider', upgradeToProvider);
router.delete('/account', deleteAccount);
router.get('/stats', getUserStats);

// Settings routes
router.put('/settings/security', updateSecuritySettings);
router.put('/settings/notifications', updateNotificationSettings);

export default router;