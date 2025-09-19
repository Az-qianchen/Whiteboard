import type { ImageData as PathImageData } from '@/types';
import { useFilesStore } from '@/context/filesStore';
import { blobToDataUrl, dataUrlToBlob } from '@/lib/fileConversion';

interface CachedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
}

const bitmapCache = new Map<string, Promise<CachedImage>>();
const resolvedCache = new Map<string, CachedImage>();
const dataUrlCache = new Map<string, Promise<string>>();

const keyFor = (path: { fileId?: string; src?: string }) => {
  if (path.fileId) return path.fileId;
  if (path.src) return path.src;
  throw new Error('Image path lacks both fileId and src reference');
};

async function loadBlob(path: { fileId?: string; src?: string }): Promise<Blob> {
  if (path.fileId) {
    const blob = await useFilesStore.getState().getBlob(path.fileId);
    if (!blob) {
      throw new Error(`Missing blob for file ${path.fileId}`);
    }
    return blob;
  }
  if (path.src) {
    return dataUrlToBlob(path.src);
  }
  throw new Error('Cannot resolve blob without file reference');
}

async function decodeBlob(path: { fileId?: string; src?: string }): Promise<CachedImage> {
  const blob = await loadBlob(path);
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob);
    return { source: bitmap, width: bitmap.width, height: bitmap.height };
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    const url = URL.createObjectURL(blob);
    element.onload = () => {
      URL.revokeObjectURL(url);
      resolve(element);
    };
    element.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image blob'));
    };
    element.src = url;
  });
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  return { source: img, width, height };
}

export function invalidateImageCache(keys: string[]) {
  keys.forEach(key => {
    const cached = resolvedCache.get(key);
    if (cached?.source instanceof ImageBitmap) {
      cached.source.close();
    }
    resolvedCache.delete(key);
    bitmapCache.delete(key);
    dataUrlCache.delete(key);
  });
}

export async function getCachedImage(path: PathImageData | { fileId?: string; src?: string }): Promise<CachedImage> {
  const key = keyFor(path);
  if (!bitmapCache.has(key)) {
    const promise = decodeBlob(path).then(result => {
      resolvedCache.set(key, result);
      return result;
    });
    bitmapCache.set(key, promise);
  }
  return bitmapCache.get(key)!;
}

export async function getImagePixelData(path: PathImageData): Promise<ImageData> {
  const cached = await getCachedImage(path);
  const canvas = document.createElement('canvas');
  canvas.width = cached.width;
  canvas.height = cached.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to acquire 2D context for image data extraction');
  }
  ctx.drawImage(cached.source, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export async function getImageDataUrl(path: ImageData): Promise<string> {
  const key = keyFor(path);
  if (!dataUrlCache.has(key)) {
    const promise = (async () => {
      const blob = await loadBlob(path);
      return blobToDataUrl(blob);
    })();
    dataUrlCache.set(key, promise);
  }
  return dataUrlCache.get(key)!;
}
