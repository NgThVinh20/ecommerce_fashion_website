// Nhận file ảnh gửi lên dạng multipart/form-data (giữ trong bộ nhớ; service kiểm tra xong mới đẩy lên Cloudinary).
// Dùng trong route: uploadImages.array('images', MAX_IMAGES) hoặc uploadImages.single('image').
import multer from 'multer';
import { AppError } from './errorHandler';

export const MAX_IMAGES = 9;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_IMAGES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new AppError(400, 'INVALID_FILE_TYPE', 'Chỉ nhận ảnh JPEG, PNG hoặc WebP'));
    }
    cb(null, true);
  },
});
