/**
 * Xử lý lỗi tập trung: mọi lỗi trong ứng dụng đều chạy về đây
 * và được trả cho client dưới cùng một dạng:
 *   { "error": { "code": "...", "message": "...", "details": ... } }
 */
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/** Lỗi nghiệp vụ do mình chủ động ném ra, kèm mã HTTP và mã lỗi riêng. */
export class AppError extends Error {
  constructor(
    public status: number,   // Mã HTTP, ví dụ 400, 401, 404, 409
    public code: string,     // Mã lỗi để client xử lý, ví dụ "EMAIL_EXISTS"
    message: string,         // Thông báo cho người đọc
  ) {
    super(message);
  }
}

/** Gọi tới đường dẫn không tồn tại: trả 404. Đặt sau tất cả các route. */
export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'NOT_FOUND', `Không tìm thấy ${req.method} ${req.originalUrl}`));
}

/** Middleware xử lý lỗi (Express nhận ra nhờ đủ 4 tham số). Đặt cuối cùng. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // 1. Dữ liệu đầu vào sai định dạng (zod kiểm tra không qua): 400
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', details: err.issues },
    });
  }

  // 2. Lỗi nghiệp vụ do mình ném ra
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }

  // 3. Vi phạm ràng buộc duy nhất trong CSDL (ví dụ trùng email): 409
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Dữ liệu đã tồn tại' } });
  }

  // 4. Lỗi không lường trước: ghi log, trả 500 (không lộ chi tiết lỗi cho client)
  console.error(err);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' } });
}
