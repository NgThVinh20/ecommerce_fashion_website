// Lưu ảnh lên Cloudinary.
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { env } from '../config/env';
import { AppError } from '../middlewares/errorHandler';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true, 
});

export interface UploadedImage {
  url: string;
  public_id: string;
}

export function uploadImage(buffer: Buffer, folder: string): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result?: UploadApiResponse) => {
        if (err || !result) {
          // trả 400 khi file không phải ảnh thật 
          if (err?.http_code === 400) {
            return reject(new AppError(400, 'INVALID_FILE_TYPE', 'File không phải ảnh hợp lệ'));
          }
          return reject(err ?? new Error('Không tải được ảnh lên Cloudinary'));
        }
        resolve({ url: result.secure_url, public_id: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

/** Xóa ảnh khỏi Cloudinary. Lỗi chỉ ghi log (dùng để dọn dẹp, không làm hỏng luồng chính). */
export async function deleteImages(publicIds: string[]) {
  await Promise.all(
    publicIds.map((id) =>
      cloudinary.uploader.destroy(id).catch((err) => console.error(`Không xóa được ảnh ${id}:`, err)),
    ),
  );
}

/**
 * Tải nhiều ảnh cùng lúc. Nếu một ảnh lỗi thì xóa các ảnh đã tải thành công rồi báo lỗi,
 * để không để lại ảnh rác trên Cloudinary.
 */
export async function uploadImages(files: Express.Multer.File[], folder: string): Promise<UploadedImage[]> {
  const results = await Promise.allSettled(files.map((f) => uploadImage(f.buffer, folder)));
  const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failed) {
    await deleteImages(ok.map((i) => i.public_id));
    throw failed.reason;
  }
  return ok;
}

/**
 * Chạy `save` sau khi đã tải ảnh lên; nếu lưu CSDL lỗi thì xóa các ảnh vừa tải để không để lại ảnh rác.
 */
export async function withImageCleanup<T>(uploaded: UploadedImage[], save: () => Promise<T>): Promise<T> {
  try {
    return await save();
  } catch (err) {
    await deleteImages(uploaded.map((i) => i.public_id));
    throw err;
  }
}
