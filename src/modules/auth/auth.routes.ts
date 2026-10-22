import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import * as authController from './auth.controller';

export const authRoutes = Router();

authRoutes.post('/register', authController.register);
authRoutes.post('/login', authController.login);
authRoutes.get('/me', requireAuth, authController.getMe);
