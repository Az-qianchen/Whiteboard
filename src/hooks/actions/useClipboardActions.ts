/**
 * 本文件定义了一个自定义 Hook，用于封装剪贴板操作（剪切、复制、粘贴）。
 */

import { useCallback } from 'react';
import type { AnyPath, WhiteboardData, Point, Tool } from '@/types';
import { getPathsBoundingBox, movePath } from '@/lib/drawing';
import { importSvg } from '@/lib/import';
import { importExcalidraw } from '@/lib/importExcalidraw';
import type { AppActionsProps } from './useAppActions';

/**
 * 封装剪贴板相关操作的 Hook。
 * @param props - 从主状态 Hook 传递的应用状态和操作。
 * @returns 包含剪切、复制和粘贴处理函数的对象。
 */
export const useClipboardActions = ({
  paths,
  selectedPathIds,
  pathState,
  toolbarState,
  viewTransform,
}: AppActionsProps) => {

  /**
   * 将选中的图形复制到剪贴板。
   */
  const handleCopy = useCallback(async () => {
    if (selectedPathIds.length > 0) {
      const selected = paths.filter(p => selectedPathIds.includes(p.id));
      const clipboardData: WhiteboardData = { type: 'whiteboard/shapes', version: 1, paths: selected };
      try {
        await navigator.clipboard.writeText(JSON.stringify(clipboardData));
      } catch (err) {
        console.error("Failed to copy shapes:", err);
        alert("Could not copy shapes to clipboard.");
      }
    }
  }, [paths, selectedPathIds]);

  /**
   * 将选中的图形剪切到剪贴板。
   */
  const handleCut = useCallback(async () => {
    if (selectedPathIds.length > 0) {
      const selected = paths.filter(p => selectedPathIds.includes(p.id));
      const clipboardData: WhiteboardData = { type: 'whiteboard/shapes', version: 1, paths: selected };
      try {
        await navigator.clipboard.writeText(JSON.stringify(clipboardData));
        pathState.setPaths(prev => prev.filter(p => !selectedPathIds.includes(p.id)));
        pathState.setSelectedPathIds([]);
      } catch (err) {
        console.error("Failed to cut shapes:", err);
        alert("无法剪切图形到剪贴板。");
      }
    }
  }, [paths, selectedPathIds, pathState]);

  /**
   * 从剪贴板粘贴图形。
   * @param options - 粘贴选项，如指定粘贴位置。
   */
  const handlePaste = useCallback(async (options?: { pasteAt?: Point, clipboardText?: string }) => {
    let text = options?.clipboardText;
    if (typeof text !== 'string') {
        try { text = await navigator.clipboard.readText(); } catch (err) { return; }
    }
    if (!text) return;

    let pathsToPaste: AnyPath[] = [];
    try {
      const data: WhiteboardData = JSON.parse(text);
      if (data?.type === 'whiteboard/shapes' && Array.isArray(data.paths)) pathsToPaste = data.paths;
    } catch (err) {}

    if (pathsToPaste.length === 0) {
      const excalidrawPaths = importExcalidraw(text);
      if (excalidrawPaths.length > 0) pathsToPaste = excalidrawPaths;
    }

    if (pathsToPaste.length === 0) {
      const trimmedText = text.trim();
      if (trimmedText.startsWith('<svg') && trimmedText.includes('</svg')) {
        try {
          const svgPaths = await importSvg(trimmedText);
          if (svgPaths.length > 0) pathsToPaste = svgPaths;
        } catch (err) {
          console.error('Failed to parse pasted SVG:', err);
          alert('粘贴的内容看起来是 SVG，但无法解析。');
          return;
        }
      }
    }
    
    if (pathsToPaste.length === 0) return;

    const newPaths: AnyPath[] = [], newIds: string[] = [];
    const copiedPathsBbox = getPathsBoundingBox(pathsToPaste);
    let dx = 20 / viewTransform.viewTransform.scale, dy = 20 / viewTransform.viewTransform.scale;

    if (options?.pasteAt && copiedPathsBbox) {
        const selectionCenterX = copiedPathsBbox.x + copiedPathsBbox.width / 2;
        const selectionCenterY = copiedPathsBbox.y + copiedPathsBbox.height / 2;
        dx = options.pasteAt.x - selectionCenterX;
        dy = options.pasteAt.y - selectionCenterY;
    }

    pathsToPaste.forEach((path, index) => {
      const newId = `${Date.now()}-${index}`;
      const newPath = { ...movePath(path, dx, dy), id: newId };
      newPaths.push(newPath);
      newIds.push(newId);
    });

    pathState.setPaths((prev: any) => [...prev, ...newPaths]);
    pathState.setSelectedPathIds(newIds);
    toolbarState.setTool('selection');
  }, [pathState, toolbarState, viewTransform.viewTransform.scale]);

  return { handleCopy, handleCut, handlePaste };
};
