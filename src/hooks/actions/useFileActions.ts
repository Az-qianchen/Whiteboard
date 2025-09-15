/**
 * 本文件定义了一个自定义 Hook，用于封装文件操作（打开、保存、导入）。
 */
import React, { useCallback, useRef } from 'react';
import type { AnyPath, WhiteboardData, Frame } from '@/types';
import * as idb from '@/lib/indexedDB';
import type { FileSystemFileHandle } from 'wicg-file-system-access';
import { fileOpen, fileSave } from 'browser-fs-access';
import { importSvg } from '@/lib/import';
import type { AppActionsProps } from './useAppActions';

type FileWithHandle = File & { handle: FileSystemFileHandle };

/**
 * 封装文件相关操作的 Hook。
 * @param props - 从主状态 Hook 传递的应用状态和操作。
 * @returns 包含文件处理函数的对象。
 */
export const useFileActions = ({
  frames,
  fps,
  setFps,
  backgroundColor,
  activeFileHandle,
  setActiveFileHandle,
  activeFileName,
  setActiveFileName,
  setBackgroundColor,
  pathState,
  toolbarState,
}: AppActionsProps) => {
  const importFileRef = useRef<HTMLInputElement>(null);

  /**
   * 提示用户选择位置以另存为文件。
   */
  const handleSaveAs = useCallback(async () => {
    const data: WhiteboardData = { type: 'whiteboard/shapes', version: 3, frames, backgroundColor, fps };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/vnd.whiteboard+json' });
    try {
        // 移除了 'id' 属性，以确保在所有浏览器中都能可靠地触发原生保存对话框，
        // 而不是依赖可能导致问题的浏览器特定行为。
        const fileHandle = await fileSave(blob, {
            fileName: activeFileName || 'untitled.whiteboard',
            extensions: ['.whiteboard'],
        });

        if (fileHandle) {
            // 检查返回的对象是否包含 'handle' 属性，
            // 这表明成功使用了 File System Access API。
            if ('handle' in fileHandle) {
                const handle = (fileHandle as unknown as FileWithHandle).handle;
                setActiveFileHandle(handle);
                setActiveFileName(fileHandle.name);
                await idb.set('last-active-file-handle', handle);
            } else {
                // 如果没有 'handle'，说明使用了备用下载方法。
                // 我们无法保留直接保存的引用，因此清除任何现有的引用。
                setActiveFileHandle(null);
                setActiveFileName(fileHandle.name);
                await idb.del('last-active-file-handle');
            }
        }
    } catch (err) {
        if ((err as Error).name === 'AbortError') {
            // 用户取消了保存对话框，这是正常行为。
            return;
        }
        console.error("Error saving file as:", err);
    }
  }, [frames, backgroundColor, fps, activeFileName, setActiveFileHandle, setActiveFileName]);

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
            const data: WhiteboardData = { type: 'whiteboard/shapes', version: 3, frames, backgroundColor, fps };
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
        } catch (err) {
            console.error("Error saving file, falling back to 'Save As':", err);
            // 如果出现任何错误（例如权限被撤销），则回退到“另存为”
            await handleSaveAs();
        }
    } else {
        await handleSaveAs();
    }
  }, [activeFileHandle, frames, backgroundColor, fps, handleSaveAs]);

  /**
   * 打开一个文件。
   */
  const handleOpen = useCallback(async () => {
    try {
        const file = await fileOpen({
            mimeTypes: ['application/vnd.whiteboard+json', 'application/json'],
            extensions: ['.whiteboard'],
            id: 'whiteboardOpen',
        });
        if (!file) return;

        const contents = await file.text();
        const data: WhiteboardData = JSON.parse(contents);

        if (data?.type === 'whiteboard/shapes' && (data.frames || data.paths)) {
            const framesToLoad = data.frames || [{ paths: data.paths ?? [] }];
            pathState.handleLoadFile(framesToLoad);
            setBackgroundColor(data.backgroundColor ?? '#212529');
            if (setFps) setFps(data.fps ?? 12);
            
            if ('handle' in file) {
                const handle = (file as unknown as FileWithHandle).handle;
                setActiveFileHandle(handle);
                setActiveFileName(file.name);
                await idb.set('last-active-file-handle', handle);
            } else {
                setActiveFileHandle(null);
                setActiveFileName(file.name);
                await idb.del('last-active-file-handle');
            }
        } else {
            alert("Invalid whiteboard file.");
        }
    } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error("Error opening file:", err);
        alert("Failed to open file.");
    }
  }, [pathState, setBackgroundColor, setFps, setActiveFileHandle, setActiveFileName]);

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

  return { handleSaveFile, handleSaveAs, handleOpen, handleImportClick, handleSvgFileChange, importFileRef, handleFileImport };
};