/**
 * 本文件定义了一个自定义 Hook，用于封装导出操作（如导出为 SVG、PNG）。
 */
import { useCallback } from 'react';
import { pathsToSvgString, pathsToPngBlob } from '../../lib/export';
import { fileSave } from 'browser-fs-access';
import type { AppActionsProps } from './useAppActions';
import type { FrameData, AnimationExportOptions, ImageData } from '../../types';
import { getPathBoundingBox, getPathsBoundingBox, doBboxesIntersect } from '../../lib/drawing';
import JSZip from 'jszip';

/**
 * 封装导出相关操作的 Hook。
 * @param props - 从主状态 Hook 传递的应用状态和操作。
 * @returns 包含所有导出处理函数的对象。
 */
export const useExportActions = ({
  paths,
  frames,
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

    if (selectedPathIds.length === 1) {
      const selectedPath = paths.find(p => p.id === selectedPathIds[0]);
      if (selectedPath?.tool === 'image') {
        try {
          const res = await fetch((selectedPath as ImageData).src);
          const blob = await res.blob();
          try {
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          } catch (err) {
            console.error('Failed to copy image to clipboard:', err);
            if (blob.type !== 'image/png') {
              try {
                const bitmap = await createImageBitmap(blob);
                const canvas = document.createElement('canvas');
                canvas.width = bitmap.width;
                canvas.height = bitmap.height;
                canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
                const pngBlob = await new Promise<Blob | null>(resolve =>
                  canvas.toBlob(b => resolve(b), 'image/png')
                );
                if (pngBlob) {
                  await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': pngBlob })
                  ]);
                  return;
                }
              } catch (err2) {
                console.error('Failed to copy image as PNG to clipboard:', err2);
              }
            }
            alert('Could not copy image.');
          }
        } catch (err) {
          console.error('Failed to fetch image for clipboard:', err);
          alert('Could not copy image.');
        }
        return;
      }
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
        id: 'whiteboardExportSvg',
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
        id: 'whiteboardExportPng',
    });
  }, [paths, backgroundColor, pngExportOptions, activeFileName]);
  
  /**
   * 导出动画。
   * @param options - 动画导出选项。
   */
  const handleExportAnimation = useCallback(async (options: AnimationExportOptions) => {
    if (frames.length <= 1) return;
  
    let clipFrame: FrameData | undefined;
    if (options.clipToFrameId && options.clipToFrameId !== 'full') {
      const allFrameShapes = frames.flatMap(f => f.paths.filter(p => p.tool === 'frame')) as FrameData[];
      clipFrame = allFrameShapes.find(f => f.id === options.clipToFrameId);
      if (!clipFrame) {
        alert(`找不到选定的裁剪画框。将导出完整画布。`);
      }
    }
  
    const globalBbox = clipFrame ? undefined : getPathsBoundingBox(frames.flatMap(f => f.paths.filter(p => p.tool !== 'frame')), true);
  
    if (!clipFrame && !globalBbox) {
      alert("无法导出空动画。");
      return;
    }
    
    const padding = 20;
  
    if (options.format === 'sequence') {
      const zip = new JSZip();
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const blob = await pathsToPngBlob(frame.paths, { 
          ...pngExportOptions, 
          backgroundColor: 'transparent', 
          transparentBg: true, 
          overrideBbox: globalBbox, 
          clipFrame: clipFrame, 
          padding 
        });
        if (blob) {
          zip.file(`frame_${String(i + 1).padStart(4, '0')}.png`, blob);
        }
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const fileName = activeFileName ? activeFileName.replace(/\.whiteboard$/, '.zip') : 'animation.zip';
      await fileSave(zipBlob, { fileName, extensions: ['.zip'], id: 'whiteboardExportAnimation' });
    } else { // spritesheet
      const frameBbox = clipFrame ? getPathBoundingBox(clipFrame, false) : globalBbox;
      if (!frameBbox) return;
  
      const frameWidth = (frameBbox.width + (clipFrame ? 0 : padding * 2)) * pngExportOptions.scale;
      const frameHeight = (frameBbox.height + (clipFrame ? 0 : padding * 2)) * pngExportOptions.scale;
      const cols = Math.max(1, options.columns);
      const rows = Math.ceil(frames.length / cols);
      
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(cols * frameWidth);
      canvas.height = Math.round(rows * frameHeight);
      const ctx = canvas.getContext('2d');
      if (!ctx) return alert("无法创建画布进行导出。");
  
      const imagePromises = frames.map(frame => 
        pathsToPngBlob(frame.paths, { 
          ...pngExportOptions, 
          backgroundColor: 'transparent', 
          transparentBg: true, 
          overrideBbox: globalBbox, 
          clipFrame: clipFrame, 
          padding 
        })
          .then(blob => blob ? createImageBitmap(blob) : null)
      );
  
      const images = await Promise.all(imagePromises);
  
      images.forEach((img, i) => {
        if (img) {
          const x = (i % cols) * frameWidth;
          const y = Math.floor(i / cols) * frameHeight;
          ctx.drawImage(img, x, y);
          img.close();
        }
      });
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const fileName = activeFileName ? activeFileName.replace(/\.whiteboard$/, '_spritesheet.png') : 'spritesheet.png';
          await fileSave(blob, { fileName, extensions: ['.png'], id: 'whiteboardExportAnimation' });
        }
      }, 'image/png');
    }
  }, [frames, pngExportOptions, activeFileName]);

  return { handleCopyAsSvg, handleCopyAsPng, handleExportAsSvg, handleExportAsPng, handleExportAnimation };
};
