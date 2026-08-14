// Image compression utility
// Compresses images client-side before upload to Supabase storage
// Limits: Avatar ≤ 50KB, Media ≤ 200KB, Post ≤ 350KB

export type ImageUploadType = 'avatar' | 'media' | 'post' | 'general';

const LIMITS: Record<ImageUploadType, number> = {
  avatar:  50 * 1024,   // 50KB
  media:   200 * 1024,  // 200KB
  post:    250 * 1024,  // 250KB (guaranteed under WhatsApp's 300KB social preview limit)
  general: 250 * 1024,  // 250KB
};

// Maximum raw file size we'll even attempt to compress (10MB)
const MAX_RAW_SIZE = 10 * 1024 * 1024;

/**
 * Validates a file before upload. Throws a user-friendly error if:
 * - The file is not an image
 * - The file exceeds the maximum raw size (10MB) — too large to process
 * Use this BEFORE calling compressImage().
 */
export function validateImageUpload(file: File, uploadType: ImageUploadType = 'general'): void {
  if (!file.type.startsWith('image/')) {
    throw new Error(`Only image files are allowed. Received: ${file.type || 'unknown file type'}`);
  }
  if (file.size > MAX_RAW_SIZE) {
    throw new Error(
      `File too large: ${formatFileSize(file.size)}. Maximum allowed raw size is ${formatFileSize(MAX_RAW_SIZE)}. Please use a smaller image file.`
    );
  }
  const limit = LIMITS[uploadType];
  // If the file is much larger than the limit (> 5x), warn that compression may degrade quality
  if (file.size > limit * 5) {
    console.warn(
      `[imageCompression] File (${formatFileSize(file.size)}) is much larger than target limit (${formatFileSize(limit)}). Heavy compression will be applied.`
    );
  }
}


/**
 * Compresses an image file to within the size limit for the given upload type.
 * Uses canvas-based compression with progressive quality reduction.
 * Returns a new File (or Blob) ready for upload.
 */
export async function compressImage(
  file: File,
  uploadType: ImageUploadType = 'general',
  maxDimension = 1920,
): Promise<File> {
  const limit = LIMITS[uploadType];

  // If already within limit, return as-is
  if (file.size <= limit) return file;

  // For non-image files, skip compression
  if (!file.type.startsWith('image/')) return file;

  // Load image into canvas
  const img = await loadImage(file);
  
  // Calculate dimensions (maintain aspect ratio)
  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height / width) * maxDimension);
      width = maxDimension;
    } else {
      width = Math.round((width / height) * maxDimension);
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);

  // Progressive quality reduction
  const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  let quality = 0.92;
  let blob: Blob | null = null;

  while (quality >= 0.4) {
    blob = await canvasToBlob(canvas, format, quality);
    if (blob.size <= limit) break;
    quality -= 0.08;
  }

  if (!blob || blob.size > limit) {
    // Last resort: reduce dimensions by 50%
    canvas.width = Math.round(width * 0.7);
    canvas.height = Math.round(height * 0.7);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, format, 0.7);
  }

  return new File([blob!], file.name, { type: format, lastModified: Date.now() });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas to Blob failed')),
      type,
      quality
    );
  });
}

/**
 * Helper to get a human-readable file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
