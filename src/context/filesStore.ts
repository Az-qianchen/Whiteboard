import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BinaryFile, BinaryFileMetadata } from '@/types';
import * as idb from '@/lib/indexedDB';
import { blobToDataUrl, createMetadataForBlob, dataUrlToBlob } from '@/lib/fileConversion';

const blobCache = new Map<string, Blob>();

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `file_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
};

interface FilesStoreState {
  files: Record<string, BinaryFileMetadata>;
  addFile: (blob: Blob, opts?: { id?: string; mimeType?: string; name?: string }) => Promise<BinaryFileMetadata>;
  addFiles: (entries: Array<{ blob: Blob; id?: string; mimeType?: string; name?: string }>) => Promise<Record<string, BinaryFileMetadata>>;
  ingestDataUrl: (dataUrl: string) => Promise<{ fileId: string; metadata: BinaryFileMetadata }>;
  getFile: (fileId: string) => Promise<BinaryFile | null>;
  getBlob: (fileId: string) => Promise<Blob | null>;
  getDataUrl: (fileId: string) => Promise<string | null>;
  deleteFiles: (fileIds: string[]) => Promise<void>;
  renameFile: (fileId: string, name: string) => void;
}

export const useFilesStore = create<FilesStoreState>()(
  persist(
    (set, get) => ({
      files: {},

      async addFile(blob, opts = {}) {
        const id = opts.id ?? generateId();
        const metadata: BinaryFileMetadata = {
          ...createMetadataForBlob(blob, id),
          mimeType: opts.mimeType ?? blob.type ?? 'application/octet-stream',
          name: opts.name,
        };
        await idb.set(`file:${id}`, blob);
        blobCache.set(id, blob);
        set(state => ({ files: { ...state.files, [id]: metadata } }));
        return metadata;
      },

      async addFiles(entries) {
        const results: Record<string, BinaryFileMetadata> = {};
        for (const entry of entries) {
          const metadata = await get().addFile(entry.blob, entry);
          results[metadata.id] = metadata;
        }
        return results;
      },

      async ingestDataUrl(dataUrl) {
        const blob = await dataUrlToBlob(dataUrl);
        const metadata = await get().addFile(blob);
        return { fileId: metadata.id, metadata };
      },

      async getBlob(fileId) {
        if (blobCache.has(fileId)) {
          return blobCache.get(fileId) ?? null;
        }
        const blob = await idb.get<Blob>(`file:${fileId}`);
        if (blob) {
          blobCache.set(fileId, blob);
          return blob;
        }
        return null;
      },

      async getFile(fileId) {
        const metadata = get().files[fileId];
        if (!metadata) return null;
        const blob = await get().getBlob(fileId);
        if (!blob) return null;
        return { ...metadata, blob };
      },

      async getDataUrl(fileId) {
        const blob = await get().getBlob(fileId);
        if (!blob) return null;
        return blobToDataUrl(blob);
      },

      async deleteFiles(fileIds) {
        if (fileIds.length === 0) return;
        await Promise.all(fileIds.map(id => idb.del(`file:${id}`)));
        fileIds.forEach(id => blobCache.delete(id));
        set(state => {
          const next = { ...state.files };
          fileIds.forEach(id => {
            delete next[id];
          });
          return { files: next };
        });
        const { invalidateImageCache } = await import('@/lib/imageCache');
        invalidateImageCache(fileIds);
      },

      renameFile(fileId, name) {
        set(state => {
          const existing = state.files[fileId];
          if (!existing) {
            return {};
          }
          const trimmed = name.trim();
          const nextName = trimmed.length > 0 ? trimmed : existing.name;
          const updated: BinaryFileMetadata = {
            ...existing,
            name: nextName,
            lastModified: Date.now(),
          };
          return { files: { ...state.files, [fileId]: updated } };
        });
      },
    }),
    {
      name: 'whiteboard_files_state',
      version: 1,
      partialize: state => ({ files: state.files }),
    }
  )
);
