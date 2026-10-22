
import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { verifyAccessToken } from '../lib/jwt';
import type { TokenPayload } from '../lib/jwt';
import { AppError } from './errorHandler';

//khai báo thuộc tính user cho request
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    throw new AppError(401, 'UNAUTHORIZED', 'Chưa đăng nhập');
  }

  const tokenParts = authorization.split(' ');
  const tokenType = tokenParts[0];
  const token = tokenParts[1];

  if (tokenType !== 'Bearer' || !token) {
    throw new AppError(401, 'UNAUTHORIZED', 'Token không hợp lệ');
  }

  try {
    const user = verifyAccessToken(token);

    req.user = user;

    next();
  } catch {
    throw new AppError(
      401,
      'INVALID_TOKEN',
      'Token không hợp lệ hoặc đã hết hạn'
    );
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return function checkRole(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const user = req.user;

    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Chưa đăng nhập');
    }

    const hasPermission = allowedRoles.includes(user.role);

    if (!hasPermission) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Không có quyền truy cập'
      );
    }

    next();
  };
}
