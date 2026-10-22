
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/** Lỗi nghiệp vụ, kèm mã HTTP và mã lỗi riêng. */
export class AppError extends Error {
  constructor(
    public status: number,   // Mã HTTP
    public code: string,     // Mã lỗi để client xử lý
    message: string,    
  ) {
    super(message);
  }
}

/** Gọi tới đường dẫn không tồn tại - 404 */
export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'NOT_FOUND', `Không tìm thấy ${req.method} ${req.originalUrl}`));
}


export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // 1. Dữ liệu đầu vào sai định dạng : 400
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', details: err.issues },
    });
  }

  // 2. Lỗi nghiệp vụ 
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }

  // 3. Vi phạm ràng buộc : 409
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Dữ liệu đã tồn tại' } });
  }

  console.error(err);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' } });
}
