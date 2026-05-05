import multer from 'multer';
import sharp from 'sharp';
import { supabaseAdmin } from '../db/supabase.js';

const MAX_IMAGE_BYTES = 5  * 1024 * 1024;   // 5 MB
const MAX_PDF_BYTES   = 50 * 1024 * 1024;   // 50 MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_PDF_TYPES   = ['application/pdf'];

const imageFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

const pdfFilter = (req, file, cb) => {
  if (ALLOWED_PDF_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_IMAGE_BYTES },
  fileFilter: imageFilter
});

export const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_PDF_BYTES },
  fileFilter: pdfFilter
});

export const uploadBookFiles = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_PDF_BYTES },
  fileFilter: (req, file, cb) => {
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
    const isPdf   = ALLOWED_PDF_TYPES.includes(file.mimetype);
    if (isImage || isPdf) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
}).fields([
  { name: 'cover_image',      maxCount: 1 },
  { name: 'back_cover_image', maxCount: 1 },
  { name: 'pdf',              maxCount: 1 }
]);

function sanitizeFilename(originalName) {
  return originalName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 100);
}

export async function uploadToStorage({ buffer, mimetype, originalName, bucket, bookId }) {
  let uploadBuffer = buffer;
  let uploadMimetype = mimetype;
  let extension = originalName.split('.').pop().toLowerCase();

  if (ALLOWED_IMAGE_TYPES.includes(mimetype)) {
    uploadBuffer = await sharp(buffer)
      .resize(800, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 85 })
      .toBuffer();
    uploadMimetype = 'image/webp';
    extension = 'webp';
  }

  const timestamp   = Date.now();
  const safeName    = sanitizeFilename(originalName.replace(/\.[^.]+$/, ''));
  const filename    = `${timestamp}_${safeName}.${extension}`;
  const storagePath = `${bookId}/${filename}`;

  const { data, error } = await supabaseAdmin
    .storage
    .from(bucket)
    .upload(storagePath, uploadBuffer, {
      contentType: uploadMimetype,
      upsert:      false
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  let publicUrl = null;
  if (bucket === 'book-covers' || bucket === 'book-back-covers') {
    const { data: urlData } = supabaseAdmin
      .storage
      .from(bucket)
      .getPublicUrl(storagePath);
    publicUrl = urlData.publicUrl;
  }

  return {
    path: storagePath,
    publicUrl
  };
}

export async function deleteFromStorage(bucket, storagePath) {
  if (!storagePath) return;
  try {
    const { error } = await supabaseAdmin
      .storage
      .from(bucket)
      .remove([storagePath]);
    if (error) {
      console.warn(`[Storage] Failed to delete ${bucket}/${storagePath}:`, error.message);
    }
  } catch (err) {
    console.warn(`[Storage] Exception deleting ${bucket}/${storagePath}:`, err.message);
  }
}

export async function getSignedUrl(bucket, storagePath, expiresIn = 3600) {
  if (!storagePath) return null;
  const { data, error } = await supabaseAdmin
    .storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn);
  if (error) {
    console.warn(`[Storage] Failed to sign URL for ${bucket}/${storagePath}:`, error.message);
    return null;
  }
  return data.signedUrl;
}
