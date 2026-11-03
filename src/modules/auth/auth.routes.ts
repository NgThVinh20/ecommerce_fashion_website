import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import * as authController from './auth.controller';

export const authRoutes = Router();

authRoutes.post('/register', authController.register);
authRoutes.post('/login', authController.login);
authRoutes.get('/me', requireAuth, authController.getMe);
authRoutes.post('/refresh', authController.refresh);
authRoutes.post('/logout', authController.logout);

// Xác thực email bằng OTP (chưa đăng nhập được nên không cần token)
authRoutes.post('/email/send-otp', authController.sendEmailOtp);
authRoutes.post('/email/verify', authController.verifyEmailOtp);