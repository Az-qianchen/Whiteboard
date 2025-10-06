/**
 * 本文件定义了一个自定义 Hook，用于封装文件操作（打开、保存、导入）。
 */
import React, { useCallback, useRef } from 'react';
import type { AnyPath, WhiteboardData, Frame } from '@/types';
import * as idb from '@/lib/indexedDB';
import type { FileSystemFileHandle } from 'wicg-file-system-access';
import { fileOpen, fileSave } from 'browser-fs-access';
import { importSvg } from '@/lib/import';
import { createDocumentSignature } from '@/lib/document';
import type { AppActionsProps } from './useAppActions';
import { getImageDataUrl } from '@/lib/imageCache';
import { useFilesStore } from '@/context/filesStore';
import { normalizeFrames, usePathsStore as usePathsStoreBase } from '@/context/pathsStore';

type FileWithHandle = File & { handle: FileSystemFileHandle };

const isFileSystemFileHandle = (value: unknown): value is FileSystemFileHandle =>
  typeof value === 'object' && value !== null && 'createWritable' in value;

/**
 * 封装文件相关操作的 Hook。
 * @param props - 从主状态 Hook 传递的应用状态和操作。
 * @returns 包含文件处理函数的对象。
 */
export const useFileActions = ({
  frames,
  revision,
  fps,
  setFps,
  backgroundColor,
  requestFitToContent,
  activeFileHandle,
  setActiveFileHandle,
  activeFileName,
  setActiveFileName,
  setBackgroundColor,
  pathState,
  toolbarState,
  markDocumentSaved,
}: AppActionsProps) => {
  const importFileRef = useRef<HTMLInputElement>(null);

  /**
   * 提示用户选择位置以另存为文件。
   */
  const handleSaveAs = useCallback(async () => {
    const filesStore = useFilesStore.getState();
    const files: Record<string, { dataURL: string; mimeType?: string }> = {};
    const seen = new Set<string>();
    for (const frame of frames) {
      for (const path of frame.paths) {
        const stack: AnyPath[] = [path];
        while (stack.length) {
          const current = stack.pop()!;
          if (current.tool === 'image') {
            const image = current as any as { fileId: string; src?: string };
            if (!seen.has(image.fileId) && filesStore.files[image.fileId]) {
              seen.add(image.fileId);
              const dataURL = await getImageDataUrl(image as any);
              files[image.fileId] = { dataURL, mimeType: filesStore.files[image.fileId]?.mimeType };
            }
          } else if (current.tool === 'group') {
            stack.push(...(current as any).children);
          }
        }
      }
    }
    const data: WhiteboardData = { type: 'whiteboard/shapes', version: 3, frames, backgroundColor, fps, files: Object.keys(files).length ? files : undefined };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/vnd.whiteboard+json' });
    try {
        // 移除了 'id' 属性，以确保在所有浏览器中都能可靠地触发原生保存对话框，
        // 而不是依赖可能导致问题的浏览器特定行为。
        const fileHandle = await fileSave(blob, {
            fileName: activeFileName || 'untitled.whiteboard',
            extensions: ['.whiteboard'],
        });

        if (fileHandle) {
            if (isFileSystemFileHandle(fileHandle)) {
                setActiveFileHandle(fileHandle);
                setActiveFileName(fileHandle.name);
                await idb.set('last-active-file-handle', fileHandle);
            } else {
                const downloadedFile = fileHandle as File;
                // 如果没有 File System Access 句柄，我们只能依赖传统下载方式。
                setActiveFileHandle(null);
                setActiveFileName(downloadedFile.name);
                await idb.del('last-active-file-handle');
            }
            markDocumentSaved(createDocumentSignature(revision, backgroundColor, fps));
        }
    } catch (err) {
        if ((err as Error).name === 'AbortError') {
            // 用户取消了保存对话框，这是正常行为。
            return;
        }
        console.error("Error saving file as:", err);
    }
  }, [frames, revision, backgroundColor, fps, activeFileName, setActiveFileHandle, setActiveFileName, markDocumentSaved]);

  /**
   * 保存当前文件。
   */
  const handleSaveFile = useCallback(async () => {
    if (activeFileHandle) {
        try {
            // 验证我们是否仍然有写入权限
            if (await activeFileHandle.queryPermission({ mode: 'readwrite' }) !== 'granted') {
                // 如果没有权限，请求权限
                if (await activeFileHandle.requestPermission({ mode: 'readwrite' }) !== 'granted') {
                    // 如果用户拒绝，则回退到“另存为”
                    throw new Error('Permission to save file was denied.');
                }
            }
            const writable = await activeFileHandle.createWritable();
            const filesStoreInner = useFilesStore.getState();
            const files: Record<string, { dataURL: string; mimeType?: string }> = {};
            const seen = new Set<string>();
            for (const frame of frames) {
              for (const path of frame.paths) {
                const stack: AnyPath[] = [path];
                while (stack.length) {
                  const current = stack.pop()!;
                  if (current.tool === 'image') {
                    const image = current as any as { fileId: string; src?: string };
                    if (!seen.has(image.fileId) && filesStoreInner.files[image.fileId]) {
                      seen.add(image.fileId);
                      const dataURL = await getImageDataUrl(image as any);
                      files[image.fileId] = { dataURL, mimeType: filesStoreInner.files[image.fileId]?.mimeType };
                    }
                  } else if (current.tool === 'group') {
                    stack.push(...(current as any).children);
                  }
                }
              }
            }
            const data: WhiteboardData = { type: 'whiteboard/shapes', version: 3, frames, backgroundColor, fps, files: Object.keys(files).length ? files : undefined };
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
            markDocumentSaved(createDocumentSignature(revision, backgroundColor, fps));
        } catch (err) {
            console.error("Error saving file, falling back to 'Save As':", err);
            // 如果出现任何错误（例如权限被撤销），则回退到“另存为”
            await handleSaveAs();
        }
    } else {
        await handleSaveAs();
    }
  }, [activeFileHandle, frames, revision, backgroundColor, fps, handleSaveAs, markDocumentSaved]);

  const loadWhiteboardDocument = useCallback(async (file: File, handle: FileSystemFileHandle | null) => {
    const contents = await file.text();
    const data: WhiteboardData = JSON.parse(contents);

    if (data?.type === 'whiteboard/shapes' && (data.frames || data.paths)) {
        if (data.files) {
            const filesStore = useFilesStore.getState();
            await Promise.all(
                Object.entries(data.files).map(async ([fileId, storedFile]) => {
                    if (filesStore.files[fileId]) return;
                    const blob = await (await fetch(storedFile.dataURL)).blob();
                    await filesStore.addFile(blob, { id: fileId, mimeType: storedFile.mimeType });
                })
            );
        }

        const rawFrames = data.frames || [{ paths: data.paths ?? [] }];
        const framesToLoad = normalizeFrames(rawFrames);
        const nextBackgroundColor = data.backgroundColor ?? '#212529';
        const nextFps = data.fps ?? fps;
        pathState.handleLoadFile(framesToLoad);
        requestFitToContent();
        setBackgroundColor(nextBackgroundColor);
        if (setFps) setFps(nextFps);

        if (handle) {
            setActiveFileHandle(handle);
            setActiveFileName(handle.name);
            await idb.set('last-active-file-handle', handle);
        } else {
            setActiveFileHandle(null);
            setActiveFileName(file.name);
            await idb.del('last-active-file-handle');
        }

        const { revision: updatedRevision } = usePathsStoreBase.getState();
        markDocumentSaved(createDocumentSignature(updatedRevision, nextBackgroundColor, nextFps));
    } else {
        alert("Invalid whiteboard file.");
    }
  }, [fps, markDocumentSaved, pathState, requestFitToContent, setActiveFileHandle, setActiveFileName, setBackgroundColor, setFps]);

  /**
   * 打开一个文件。
   */
  const handleOpen = useCallback(async () => {
    try {
        const file = await fileOpen({
            mimeTypes: ['application/vnd.whiteboard+json', 'application/json'],
            extensions: ['.whiteboard'],
            id: 'whiteboardOpen',
        }) as FileWithHandle;
        if (!file) return;

        const handle = 'handle' in file ? file.handle : null;
        await loadWhiteboardDocument(file, handle ?? null);
    } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error("Error opening file:", err);
        alert("Failed to open file.");
    }
  }, [loadWhiteboardDocument]);

  const handleOpenFromHandle = useCallback(async (fileHandle: FileSystemFileHandle) => {
    try {
        let permission = await fileHandle.queryPermission({ mode: 'read' as const });
        if (permission === 'prompt') {
            permission = await fileHandle.requestPermission({ mode: 'read' as const });
        }
        if (permission !== 'granted') {
            alert('Permission to open this file was denied.');
            return;
        }

        const file = await fileHandle.getFile();
        await loadWhiteboardDocument(file, fileHandle);
    } catch (err) {
        console.error('Error opening file from handle:', err);
        alert('Failed to open file.');
    }
  }, [loadWhiteboardDocument]);

  /**
   * 触发文件导入对话框。
   */
  const handleImportClick = () => {
    importFileRef.current?.click();
  };
  
  /**
   * 处理文件导入。
   */
  const handleFileImport = async (file: File) => {
    const svgString = await file.text();
    const importedPaths = importSvg(svgString);
    if (importedPaths.length > 0) {
        pathState.setPaths((prev: AnyPath[]) => [...prev, ...importedPaths]);
        pathState.setSelectedPathIds(importedPaths.map(p => p.id));
        toolbarState.setTool('selection');
    }
  };

  /**
   * 处理 SVG 文件选择变化事件。
   */
  const handleSvgFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        await handleFileImport(file);
    }
    e.target.value = '';
  };

  return { handleSaveFile, handleSaveAs, handleOpen, handleOpenFromHandle, handleImportClick, handleSvgFileChange, importFileRef, handleFileImport };
};