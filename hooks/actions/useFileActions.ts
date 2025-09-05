/**
 * 本文件定义了一个自定义 Hook，用于封装文件操作（打开、保存、导入）。
 */
import React, { useCallback, useRef } from 'react';
import type { AnyPath, WhiteboardData, Tool } from '../../types';
import * as idb from '../../lib/indexedDB';
import type { FileSystemFileHandle } from 'wicg-file-system-access';
import { fileOpen, fileSave } from 'browser-fs-access';
import { importSvg } from '../../lib/import';
import type { AppActionsProps } from '../useAppActions';

type FileWithHandle = File & { handle: FileSystemFileHandle };

/**
 * 封装文件相关操作的 Hook。
 * @param props - 从主状态 Hook 传递的应用状态和操作。
 * @returns 包含文件处理函数的对象。
 */
export const useFileActions = ({
  paths,
  backgroundColor,
  activeFileHandle,
  setActiveFileHandle,
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
    const data: WhiteboardData = { type: 'whiteboard/shapes', version: 1, paths, backgroundColor };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/vnd.whiteboard+json' });
    try {
        const fileHandle = await fileSave(blob, {
            fileName: 'untitled.whiteboard',
            extensions: ['.whiteboard'],
        });
        if (fileHandle) {
            setActiveFileHandle((fileHandle as unknown as FileWithHandle).handle);
            setActiveFileName(fileHandle.name);
            await idb.set('last-active-file-handle', (fileHandle as unknown as FileWithHandle).handle);
        }
    } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error("Error saving file as:", err);
    }
  }, [paths, backgroundColor, setActiveFileHandle, setActiveFileName]);

  /**
   * 保存当前文件。如果已有文件句柄，则直接保存；否则，提示用户另存为。
   */
  const handleSaveFile = useCallback(async () => {
    if (activeFileHandle) {
        try {
            const writable = await activeFileHandle.createWritable();
            const data: WhiteboardData = { type: 'whiteboard/shapes', version: 1, paths, backgroundColor };
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
        } catch (err) {
            console.error("Error saving file:", err);
            await handleSaveAs();
        }
    } else {
        await handleSaveAs();
    }
  }, [activeFileHandle, paths, backgroundColor, handleSaveAs]);

  /**
   * 打开一个文件。
   */
  const handleOpen = useCallback(async () => {
    try {
        const file = await fileOpen({
            mimeTypes: ['application/vnd.whiteboard+json', 'application/json'],
            extensions: ['.whiteboard'],
        });
        if (!file) return;

        const contents = await file.text();
        const data: WhiteboardData = JSON.parse(contents);

        if (data?.type === 'whiteboard/shapes' && Array.isArray(data.paths)) {
            pathState.handleLoadFile(data.paths);
            setBackgroundColor(data.backgroundColor ?? '#121215');
            
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
  }, [pathState, setBackgroundColor, setActiveFileHandle, setActiveFileName]);

  /**
   * 触发文件导入对话框。
   */
  const handleImportClick = () => {
    importFileRef.current?.click();
  };
  
  /**
   * 处理文件导入。
   * @param file - 要导入的文件。
   */
  const handleFileImport = async (file: File) => {
    const svgString = await file.text();
    const importedPaths = await importSvg(svgString);

    if (importedPaths.length > 0) {
        pathState.setPaths((prev: AnyPath[]) => [...prev, ...importedPaths]);
        pathState.setSelectedPathIds(importedPaths.map(p => p.id));
        toolbarState.setTool('selection');
    }
  };

  /**
   * 处理 SVG 文件选择变化事件。
   * @param e - 文件输入变化事件。
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
