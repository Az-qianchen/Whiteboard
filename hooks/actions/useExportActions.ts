/**
 * 本文件定义了一个自定义 Hook，用于封装导出操作（如导出为 SVG、PNG）。
 */
import { useCallback } from 'react';
import { pathsToSvgString, pathsToPngBlob } from '../../lib/export';
import { fileSave } from 'browser-fs-access';
import type { AppActionsProps } from '../useAppActions';
import type { FrameData } from '../../types';
import { getPathBoundingBox, doBboxesIntersect } from '../../lib/drawing';

/**
 * 封装导出相关操作的 Hook。
 * @param props - 从主状态 Hook 传递的应用状态和操作。
 * @returns 包含所有导出处理函数的对象。
 */
export const useExportActions = ({
  paths,
  selectedPathIds,
  backgroundColor,
  pngExportOptions,
  activeFileName,
}: AppActionsProps) => {

  /**
   * 将选中的图形复制为 SVG 字符串到剪贴板。
   */
  const handleCopyAsSvg = useCallback(async () => {
    if (selectedPathIds.length === 0) return;
    const selected = paths.filter(p => selectedPathIds.includes(p.id));
    const svgString = await pathsToSvgString(selected, { padding: 10 });
    if (!svgString) {
        alert("Could not generate SVG.");
        return;
    }
    try {
        await navigator.clipboard.writeText(svgString);
    } catch (err) {
        console.error("Failed to copy SVG to clipboard:", err);
        alert("无法将 SVG 复制到剪贴板。");
    }
  }, [paths, selectedPathIds]);
  
  /**
   * 将选中的图形复制为 PNG 图像到剪贴板。
   */
  const handleCopyAsPng = useCallback(async () => {
    if (selectedPathIds.length === 0) return;

    // --- Frame Export Logic ---
    if (selectedPathIds.length === 1) {
      const selectedPath = paths.find(p => p.id === selectedPathIds[0]);
      if (selectedPath && selectedPath.tool === 'frame') {
        const frame = selectedPath as FrameData;
        const rotatedFrameBbox = getPathBoundingBox(frame, true);

        const contentPaths = paths.filter(p => {
            if (p.id === frame.id) return false;
            const pathBbox = getPathBoundingBox(p, true);
            return pathBbox && doBboxesIntersect(pathBbox, rotatedFrameBbox);
        });

        const blob = await pathsToPngBlob(contentPaths, {
            backgroundColor: 'transparent',
            scale: pngExportOptions.scale,
            highQuality: pngExportOptions.highQuality,
            transparentBg: true,
            clipFrame: frame,
        });

        if (!blob) {
            alert("Could not copy image.");
            return;
        }
        try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        } catch (err) {
            console.error("Failed to copy PNG to clipboard:", err);
            alert("Could not copy PNG to clipboard. Your browser might not support this feature.");
        }
        return; // Exit after handling frame export
      }
    }

    // --- Default Export Logic ---
    const selected = paths.filter(p => selectedPathIds.includes(p.id));
    const blob = await pathsToPngBlob(selected, {
        backgroundColor: 'transparent',
        scale: 1,
        highQuality: true,
        transparentBg: true,
    });
    if (!blob) {
        alert("Could not copy image.");
        return;
    }
    try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch (err) {
        console.error("Failed to copy PNG to clipboard:", err);
        alert("Could not copy PNG to clipboard. Your browser might not support this feature.");
    }
  }, [paths, selectedPathIds, pngExportOptions]);

  /**
   * 导出整个画布为 SVG 文件。
   */
  const handleExportAsSvg = useCallback(async () => {
    if (paths.length === 0) return;
    const svgString = await pathsToSvgString(paths, { padding: 20 });
    if (!svgString) {
      alert("Could not generate SVG for export.");
      return;
    }
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const fileName = activeFileName ? activeFileName.replace(/\.whiteboard$/, '.svg') : 'whiteboard.svg';
    await fileSave(blob, {
        fileName: fileName,
        extensions: ['.svg'],
    });
  }, [paths, activeFileName]);

  /**
   * 导出整个画布为 PNG 文件。
   */
  const handleExportAsPng = useCallback(async () => {
    if (paths.length === 0) return;
    const blob = await pathsToPngBlob(paths, {
        backgroundColor: pngExportOptions.transparentBg ? 'transparent' : backgroundColor,
        ...pngExportOptions
    });
    if (!blob) {
        alert("Could not generate PNG for export.");
        return;
    }
    const fileName = activeFileName ? activeFileName.replace(/\.whiteboard$/, '.png') : 'whiteboard.png';
    const scaleSuffix = pngExportOptions.scale !== 1 ? `@${pngExportOptions.scale}x` : '';
    await fileSave(blob, {
        fileName: fileName.replace(/(\.png)$/, `${scaleSuffix}$1`),
        extensions: ['.png'],
    });
  }, [paths, backgroundColor, pngExportOptions, activeFileName]);

  return { handleCopyAsSvg, handleCopyAsPng, handleExportAsSvg, handleExportAsPng };
};