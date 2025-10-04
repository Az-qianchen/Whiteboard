/**
 * 本文件是 Whiteboard 的子组件，负责渲染所有已经完成并存储的绘图路径。
 * 它使用 RoughJS 库来创建手绘风格的 SVG 图形。
 */

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { RoughSVG } from 'roughjs/bin/svg';
import type { AnyPath, FrameData, GroupData, ImageData } from '@/types';
import { renderPathNode } from '@/lib/export';
import { getImageDataUrl } from '@/lib/imageCache';
import { getShapeTransformMatrix, isIdentityMatrix, matrixToString } from '@/lib/drawing/transform/matrix';
import { AppContext } from '@/context/AppContext';

/**
 * 递归地查找并返回路径树中所有的画框对象。
 * @param paths - 要搜索的路径数组。
 * @returns 一个包含所有找到的画框对象的数组。
 */
const getAllFrames = (paths: AnyPath[], accumulator: AnyPath[] = []): AnyPath[] => {
  for (const path of paths) {
    if (path.tool === 'frame') {
      accumulator.push(path);
    } else if (path.tool === 'group') {
      getAllFrames((path as GroupData).children, accumulator);
    }
  }
  return accumulator;
};

/**
 * 一个递归组件，用于渲染单个路径或一个组及其子路径。
 * @description 对常规组进行递归渲染，以利用 React 的 diffing 算法，
 * 仅更新组内已更改的元素。遮罩组则被视为原子单元进行渲染。
 */
interface PathComponentProps {
    rc: RoughSVG | null;
    data: AnyPath;
    previewSrcById?: Record<string, string>;
    editingPathId: string | null;
}

const PathComponent: React.FC<PathComponentProps> = React.memo(({ rc, data, previewSrcById, editingPathId }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const lastImageKeyRef = useRef<string | null>(null);
    const latestImageDataRef = useRef<ImageData | null>(null);

    const previewSrc = data.tool === 'image' ? previewSrcById?.[data.id] ?? null : null;
    const baseImageKey = data.tool === 'image'
        ? (data.fileId ?? data.src ?? null)
        : null;
    const imageKey = previewSrc ?? baseImageKey;

    latestImageDataRef.current = data.tool === 'image' ? (data as ImageData) : null;

    useEffect(() => {
        let cancelled = false;

        if (!imageKey) {
            lastImageKeyRef.current = null;
            setImageSrc(prev => (prev === null ? prev : null));
            return () => {
                cancelled = true;
            };
        }

        const imageData = latestImageDataRef.current;
        if (!imageData) {
            lastImageKeyRef.current = null;
            return () => {
                cancelled = true;
            };
        }

        if (previewSrc) {
            lastImageKeyRef.current = imageKey;
            setImageSrc(prev => (prev === previewSrc ? prev : previewSrc));
            return () => {
                cancelled = true;
            };
        }

        if (lastImageKeyRef.current === imageKey) {
            return () => {
                cancelled = true;
            };
        }

        setImageSrc(prev => (prev === null ? prev : null));

        void getImageDataUrl(imageData)
            .then((src) => {
                if (!cancelled) {
                    setImageSrc(prev => (prev === src ? prev : src));
                    lastImageKeyRef.current = imageKey;
                }
            })
            .catch((err) => console.error('Failed to resolve image for rendering', err));

        return () => {
            cancelled = true;
        };
    }, [imageKey, previewSrc]);

    // 如果路径是常规（非遮罩）组，则递归渲染其子项以获得性能优势。
    if (data.tool === 'group' && !(data as GroupData).mask) {
        return (
            <g>
                {(data as GroupData).children.map(child => (
                    <PathComponent
                        key={child.id}
                        rc={rc}
                        data={child}
                        previewSrcById={previewSrcById}
                        editingPathId={editingPathId}
                    />
                ))}
            </g>
        );
    }

    if (data.tool === 'text' && editingPathId === data.id) {
        return null;
    }

    // 对于原始路径和遮罩组，使用 `renderPathNode` 生成其 SVG 字符串。
    // 遮罩组需要作为一个整体进行渲染，以正确生成 <clipPath> 和相关结构。
    const nodeString = useMemo(() => {
        if (!rc) return '';
        if (data.tool === 'image') {
            if (!imageSrc) return '';
            const prepared = { ...(data as ImageData), src: imageSrc };
            const node = renderPathNode(rc, prepared);
            return node ? node.outerHTML : '';
        }
        const node = renderPathNode(rc, data);
        // 使用 outerHTML 确保整个节点都被正确序列化。
        return node ? node.outerHTML : '';
    }, [rc, data, imageSrc]);

    // 使用 dangerouslySetInnerHTML 来渲染预先计算好的 SVG 字符串。
    return <g className="pointer-events-none" dangerouslySetInnerHTML={{ __html: nodeString }} />;
});

/**
 * Renders a single non-group path using RoughJS.
 * This is optimized for live previews where we don't need group recursion or frame logic.
 */
export const RoughPath: React.FC<{ rc: RoughSVG | null; data: AnyPath; }> = React.memo(({ rc, data }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const lastImageKeyRef = useRef<string | null>(null);
    const latestImageDataRef = useRef<ImageData | null>(null);

    const imageKey = data.tool === 'image'
        ? (data.fileId ?? data.src ?? null)
        : null;

    latestImageDataRef.current = data.tool === 'image' ? (data as ImageData) : null;

    useEffect(() => {
        let cancelled = false;

        if (!imageKey) {
            lastImageKeyRef.current = null;
            setImageSrc(prev => (prev === null ? prev : null));
            return () => {
                cancelled = true;
            };
        }

        const imageData = latestImageDataRef.current;
        if (!imageData) {
            lastImageKeyRef.current = null;
            return () => {
                cancelled = true;
            };
        }

        if (lastImageKeyRef.current === imageKey) {
            return () => {
                cancelled = true;
            };
        }

        setImageSrc(prev => (prev === null ? prev : null));

        void getImageDataUrl(imageData)
            .then((src) => {
                if (!cancelled) {
                    setImageSrc(prev => (prev === src ? prev : src));
                    lastImageKeyRef.current = imageKey;
                }
            })
            .catch((err) => console.error('Failed to resolve image for rough path', err));

        return () => {
            cancelled = true;
        };
    }, [imageKey]);

    const nodeString = useMemo(() => {
        if (!rc || data.tool === 'group') return '';
        if (data.tool === 'image') {
            if (!imageSrc) return '';
            const prepared = { ...(data as ImageData), src: imageSrc };
            const node = renderPathNode(rc, prepared);
            return node ? node.outerHTML : '';
        }
        const node = renderPathNode(rc, data);
        return node ? node.outerHTML : '';
    }, [rc, data, imageSrc]);

    // Use dangerouslySetInnerHTML to render the pre-computed SVG string.
    return <g className="pointer-events-none" dangerouslySetInnerHTML={{ __html: nodeString }} />;
});


interface PathsRendererProps {
  paths: AnyPath[];
  rc: RoughSVG | null;
  isBackground?: boolean;
  previewSrcById?: Record<string, string>;
}


/**
 * 负责渲染一组路径的主组件。
 * @description 它遍历顶层路径，并为每个路径渲染一个 `PathComponent`。
 * 递归由 `PathComponent` 内部处理。
 */
export const PathsRenderer: React.FC<PathsRendererProps> = React.memo(({ paths, rc, isBackground, previewSrcById }) => {
  const appContext = useContext(AppContext);
  const editingPathId = appContext?.textEditing?.pathId ?? null;

  // 预先计算画框列表，以便在其上方渲染编号。
  const frames = useMemo(() => getAllFrames(paths), [paths]);
  return (
    <g opacity={isBackground ? 0.3 : 1} style={{ pointerEvents: isBackground ? 'none' : 'auto' }}>
      {paths.map((path) => (
        <PathComponent
          key={path.id}
          rc={rc}
          data={path}
          previewSrcById={previewSrcById}
          editingPathId={editingPathId}
        />
      ))}
      {/* 渲染所有路径后，在其上方渲染画框编号 */}
      {frames.map((frame, index) => {
        const frameData = frame as FrameData;
        const padding = 8;
        const labelHeight = 24;
        const number = index + 1;
        const textContent = String(number);
        const textPadding = 8;
        // 估算文本宽度以确定背景矩形的尺寸
        const textWidth = (textContent.length * 8) + (2 * textPadding);
        const labelWidth = textWidth;

        const matrix = getShapeTransformMatrix(frameData);
        const transform = isIdentityMatrix(matrix) ? undefined : matrixToString(matrix);

        return (
          <g key={`label-${frame.id}`} transform={transform} className="pointer-events-none">
            <text
              x={frameData.x + padding + labelWidth / 2}
              y={frameData.y + padding + labelHeight / 2}
              fill={frameData.color}
              stroke="var(--bg-color)"
              strokeWidth="3"
              strokeLinejoin="round"
              paintOrder="stroke"
              fontSize="14"
              fontWeight="bold"
              fontFamily="sans-serif"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {textContent}
            </text>
          </g>
        );
      })}
    </g>
  );
});