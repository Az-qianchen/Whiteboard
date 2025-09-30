import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ImageData as PathImageData } from '@/types';
import type { HsvAdjustment } from '@/lib/image';
import { getImagePixelData } from '@/lib/imageCache';
import { useFilesStore } from '@/context/filesStore';
import { blobToDataUrl } from '@/lib/fileConversion';

type NormalizedAdjustment = Required<Pick<HsvAdjustment, 'h' | 's' | 'v'>>;

interface ActivePreviewState {
  pathId: string;
  ready: Promise<void> | null;
  objectUrl: string | null;
  lastImageData: ImageData | null;
  lastBlob: Blob | null;
  lastAdjustment: NormalizedAdjustment;
}

interface WorkerResponse {
  type: 'init' | 'adjust' | 'reset' | 'error';
  requestId: number;
  width?: number;
  height?: number;
  buffer?: ArrayBuffer;
  error?: string;
}

type WorkerMessage =
  | Omit<import('@/workers/imageHsvWorker').InitMessage, 'requestId'>
  | Omit<import('@/workers/imageHsvWorker').AdjustMessage, 'requestId'>
  | Omit<import('@/workers/imageHsvWorker').ResetMessage, 'requestId'>;

export interface ImageHsvPreviewController {
  previewSrcById: Record<string, string>;
  previewRequestVersion: number;
  beginPreview: () => Promise<boolean>;
  updatePreview: (adjustment: HsvAdjustment) => Promise<void>;
  commitPreview: (adjustment: HsvAdjustment) => Promise<void>;
  cancelPreview: () => Promise<void>;
}

interface UseImageHsvPreviewOptions {
  getActiveImagePath: () => PathImageData | null;
  applyCommittedFile: (pathId: string, fileId: string) => void;
}

const normalizeAdjustment = (adjustment: HsvAdjustment): NormalizedAdjustment => ({
  h: adjustment.h ?? 0,
  s: adjustment.s ?? 0,
  v: adjustment.v ?? 0,
});

const imageDataToBlob = async (imageData: ImageData): Promise<Blob> => {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to acquire offscreen canvas context');
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.convertToBlob({ type: 'image/png' });
  }

  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to acquire canvas context for preview conversion');
  }
  ctx.putImageData(imageData, 0, 0);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas failed to produce blob'));
      }
    }, 'image/png');
  });
};

export const useImageHsvPreview = ({ getActiveImagePath, applyCommittedFile }: UseImageHsvPreviewOptions): ImageHsvPreviewController => {
  const [previewSrcById, setPreviewSrcById] = useState<Record<string, string>>({});
  const [previewRequestVersion, setPreviewRequestVersion] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const pendingResponsesRef = useRef(new Map<number, { resolve: (payload: WorkerResponse) => void; reject: (error: Error) => void }>());
  const activePreviewRef = useRef<ActivePreviewState | null>(null);
  const latestAdjustRequestRef = useRef<number | null>(null);
  const requestVersionRef = useRef(0);

  const bumpPreviewRequestVersion = useCallback(() => {
    requestVersionRef.current += 1;
    setPreviewRequestVersion(requestVersionRef.current);
    return requestVersionRef.current;
  }, []);

  const ensureWorker = useCallback(() => {
    if (workerRef.current) {
      return workerRef.current;
    }

    const worker = new Worker(new URL('../workers/imageHsvWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const pending = pendingResponsesRef.current.get(response.requestId);
      if (!pending) {
        return;
      }
      pendingResponsesRef.current.delete(response.requestId);
      if (response.type === 'error') {
        pending.reject(new Error(response.error ?? 'Unknown worker error'));
      } else {
        pending.resolve(response);
      }
    };
    worker.onerror = (event) => {
      const error = event instanceof ErrorEvent ? event.error : new Error('Worker error');
      pendingResponsesRef.current.forEach(({ reject }) => reject(error as Error));
      pendingResponsesRef.current.clear();
    };

    workerRef.current = worker;
    return worker;
  }, []);

  const callWorker = useCallback(
    (message: WorkerMessage, transfer?: Transferable[]) => {
      const worker = ensureWorker();
      const requestId = ++requestIdRef.current;
      const payload = { ...message, requestId } as WorkerMessage & { requestId: number };
      const promise = new Promise<WorkerResponse>((resolve, reject) => {
        pendingResponsesRef.current.set(requestId, { resolve, reject });
      });
      worker.postMessage(payload, transfer ?? []);
      return { requestId, promise };
    },
    [ensureWorker],
  );

  const revokePreviewUrl = useCallback((state: ActivePreviewState | null) => {
    if (state?.objectUrl) {
      URL.revokeObjectURL(state.objectUrl);
    }
  }, []);

  const cancelPreview = useCallback(async () => {
    const active = activePreviewRef.current;
    if (!active) {
      return;
    }

    revokePreviewUrl(active);
    setPreviewSrcById(prev => {
      if (!(active.pathId in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[active.pathId];
      return next;
    });

    activePreviewRef.current = null;
    latestAdjustRequestRef.current = null;

    try {
      await callWorker({ type: 'reset' }).promise;
    } catch (error) {
      console.error('Failed to reset HSV preview worker', error);
    }
  }, [callWorker, revokePreviewUrl]);

  const beginPreview = useCallback(async () => {
    const path = getActiveImagePath();
    if (!path) {
      return false;
    }

    const existing = activePreviewRef.current;
    if (existing?.pathId && existing.pathId !== path.id) {
      await cancelPreview();
    }

    try {
      const pixelData = await getImagePixelData(path);
      const buffer = pixelData.data.buffer.slice(0);
      const { promise } = callWorker({
        type: 'init',
        width: pixelData.width,
        height: pixelData.height,
        buffer,
      }, [buffer]);

      const readyPromise = promise.then(() => undefined);
      activePreviewRef.current = {
        pathId: path.id,
        ready: readyPromise,
        objectUrl: null,
        lastImageData: null,
        lastBlob: null,
        lastAdjustment: { h: 0, s: 0, v: 0 },
      };

      await readyPromise;
      return true;
    } catch (error) {
      console.error('Failed to prepare HSV preview', error);
      activePreviewRef.current = null;
      return false;
    }
  }, [callWorker, cancelPreview, getActiveImagePath]);

  const updatePreview = useCallback(async (adjustment: HsvAdjustment) => {
    const active = activePreviewRef.current;
    if (!active) {
      return;
    }

    try {
      await active.ready;
    } catch (error) {
      console.error('HSV preview worker initialization failed', error);
      return;
    }

    const normalized = normalizeAdjustment(adjustment);
    active.lastAdjustment = normalized;

    bumpPreviewRequestVersion();
    const { requestId, promise } = callWorker({ type: 'adjust', adjustment: normalized });
    latestAdjustRequestRef.current = requestId;

    try {
      const response = await promise;
      if (latestAdjustRequestRef.current !== requestId) {
        return;
      }
      if (!response.buffer || typeof response.width !== 'number' || typeof response.height !== 'number') {
        return;
      }

      const pixels = new Uint8ClampedArray(response.buffer);
      const imageData = new ImageData(pixels, response.width, response.height);
      active.lastImageData = imageData;

      try {
        const blob = await imageDataToBlob(imageData);
        active.lastBlob = blob;
        const nextUrl = URL.createObjectURL(blob);
        revokePreviewUrl(active);
        active.objectUrl = nextUrl;
        setPreviewSrcById(prev => ({ ...prev, [active.pathId]: nextUrl }));
      } catch (error) {
        console.error('Failed to materialize HSV preview blob', error);
      }
    } catch (error) {
      console.error('Failed to update HSV preview', error);
    }
  }, [callWorker, revokePreviewUrl, bumpPreviewRequestVersion]);

  const commitPreview = useCallback(async (adjustment: HsvAdjustment) => {
    const active = activePreviewRef.current;
    if (!active) {
      return;
    }

    try {
      await active.ready;
    } catch (error) {
      console.error('HSV preview worker initialization failed', error);
      return;
    }

    const normalized = normalizeAdjustment(adjustment);
    if (
      !active.lastImageData ||
      active.lastAdjustment.h !== normalized.h ||
      active.lastAdjustment.s !== normalized.s ||
      active.lastAdjustment.v !== normalized.v
    ) {
      await updatePreview(normalized);
    }

    bumpPreviewRequestVersion();
    const imageData = active.lastImageData;
    if (!imageData) {
      return;
    }

    let blob = active.lastBlob;
    try {
      if (!blob) {
        blob = await imageDataToBlob(imageData);
      }
    } catch (error) {
      console.error('Failed to finalize HSV preview blob', error);
      return;
    }

    if (!blob) {
      return;
    }

    try {
      const dataUrl = await blobToDataUrl(blob);
      const { fileId } = await useFilesStore.getState().ingestDataUrl(dataUrl);
      applyCommittedFile(active.pathId, fileId);
    } catch (error) {
      console.error('Failed to commit HSV preview', error);
    } finally {
      await cancelPreview();
    }
  }, [applyCommittedFile, cancelPreview, updatePreview, bumpPreviewRequestVersion]);

  useEffect(() => () => {
    void cancelPreview();
    workerRef.current?.terminate();
    workerRef.current = null;
  }, [cancelPreview]);

  return useMemo(() => ({
    previewSrcById,
    previewRequestVersion,
    beginPreview,
    updatePreview,
    commitPreview,
    cancelPreview,
  }), [previewSrcById, previewRequestVersion, beginPreview, updatePreview, commitPreview, cancelPreview]);
};
