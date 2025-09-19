import type { BinaryFileMetadata } from '@/types';

/**
 * Convert a data URL string into a Blob.
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Convert a Blob into a data URL string.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to convert blob to data URL'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Create a metadata entry describing a binary blob.
 */
export function createMetadataForBlob(blob: Blob, id: string): BinaryFileMetadata {
  const now = Date.now();
  return {
    id,
    mimeType: blob.type || 'application/octet-stream',
    size: blob.size,
    created: now,
    lastModified: now,
  };
}
