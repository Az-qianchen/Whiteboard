/**
 * 本文件是 Whiteboard 的子组件，负责渲染所有已经完成并存储的绘图路径。
 * 它使用 RoughJS 库来创建手绘风格的 SVG 图形。
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RoughSVG } from 'roughjs/bin/svg';
import type { AnyPath, FrameData, GroupData, ImageData } from '@/types';
import { renderPathNode } from '@/lib/export';
import { getImageDataUrl } from '@/lib/imageCache';
import { getShapeTransformMatrix, isIdentityMatrix, matrixToString } from '@/lib/drawing/transform/matrix';

/**
 * 递归地查找并返回路径树中所有的画框对象。
 * @param paths - 要搜索的路径数组。
 * @returns 一个包含所有找到的画框对象的数组。
 */
const getAllFrames = (paths: AnyPath[]): AnyPath[] => {
  let allFrames: AnyPath[] = [];
  for (const path of paths) {
    if (path.tool === 'frame') {
      allFrames.push(path);
    } else if (path.tool === 'group') {
      allFrames = [...allFrames, ...getAllFrames((path as GroupData).children)];
    }
  }
  return allFrames;
};

/**
 * 一个递归组件，用于渲染单个路径或一个组及其子路径。
 * @description 对常规组进行递归渲染，以利用 React 的 diffing 算法，
 * 仅更新组内已更改的元素。遮罩组则被视为原子单元进行渲染。
 */
const EffectsFilter: React.FC<{ id: string; data: ImageData }> = ({ id, data }) => {
    const hasBlur = (data.blur ?? 0) > 0;
    const hasShadow = data.shadowEnabled === true;

    if (!hasBlur && !hasShadow) {
        return null;
    }

    const commonProps = {
        id,
        x: '-50%',
        y: '-50%',
        width: '200%',
        height: '200%',
    } as const;

    if (hasBlur && hasShadow) {
        return (
            <filter {...commonProps}>
                <feGaussianBlur in="SourceAlpha" stdDeviation={data.shadowBlur ?? 2} result="shadowBlur" />
                <feOffset in="shadowBlur" dx={data.shadowOffsetX ?? 2} dy={data.shadowOffsetY ?? 2} result="shadowOffset" />
                <feFlood floodColor={data.shadowColor ?? 'rgba(0,0,0,0.5)'} result="shadowColor" />
                <feComposite in="shadowColor" in2="shadowOffset" operator="in" result="shadow" />
                <feGaussianBlur in="SourceGraphic" stdDeviation={data.blur ?? 0} result="mainBlur" />
                <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="mainBlur" />
                </feMerge>
            </filter>
        );
    }

    if (hasShadow) {
        return (
            <filter {...commonProps}>
                <feDropShadow
                    dx={data.shadowOffsetX ?? 2}
                    dy={data.shadowOffsetY ?? 2}
                    stdDeviation={data.shadowBlur ?? 2}
                    floodColor={data.shadowColor ?? 'rgba(0,0,0,0.5)'}
                />
            </filter>
        );
    }

    return (
        <filter {...commonProps}>
            <feGaussianBlur stdDeviation={data.blur ?? 0} />
        </filter>
    );
};

const ImagePath: React.FC<{ data: ImageData }> = React.memo(({ data }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(() => data.src ?? null);
    const latestDataRef = useRef(data);
    latestDataRef.current = data;

    const identity = data.fileId ?? data.src ?? data.id;

    useEffect(() => {
        if (!identity) {
            setImageSrc(null);
            return;
        }

        let cancelled = false;
        const current = latestDataRef.current;

        if (current.src && current.src.startsWith('data:')) {
            setImageSrc(current.src);
            return () => {
                cancelled = true;
            };
        }

        setImageSrc(null);
        void getImageDataUrl(current)
            .then((src) => {
                if (!cancelled) setImageSrc(src);
            })
            .catch((err) => {
                console.error('Failed to resolve image for rendering', err);
            });

        return () => {
            cancelled = true;
        };
    }, [identity]);

    useEffect(() => {
        if (data.src && data.src.startsWith('data:')) {
            setImageSrc(data.src);
        }
    }, [data.src]);

    if (!imageSrc) {
        return <g className="pointer-events-none" />;
    }

    const matrix = getShapeTransformMatrix(data);
    const transform = isIdentityMatrix(matrix) ? undefined : matrixToString(matrix);
    const opacity = data.opacity !== undefined && data.opacity < 1 ? data.opacity : undefined;
    const clipPathId = data.borderRadius && data.borderRadius > 0 ? `clip-${data.id}` : undefined;
    const hasBlur = (data.blur ?? 0) > 0;
    const hasShadow = data.shadowEnabled === true;
    const filterId = hasBlur || hasShadow ? `effects-${data.id}` : undefined;

    const defsChildren: React.ReactNode[] = [];
    if (clipPathId) {
        defsChildren.push(
            <clipPath id={clipPathId} key="clip">
                <rect
                    x={data.x}
                    y={data.y}
                    width={data.width}
                    height={data.height}
                    rx={data.borderRadius}
                    ry={data.borderRadius}
                />
            </clipPath>
        );
    }

    if (filterId) {
        defsChildren.push(<EffectsFilter id={filterId} data={data} key="filter" />);
    }

    const imageProps: React.SVGProps<SVGImageElement> = {
        href: imageSrc,
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        preserveAspectRatio: 'none',
    };

    if (clipPathId) {
        imageProps.clipPath = `url(#${clipPathId})`;
    }

    if (filterId) {
        imageProps.filter = `url(#${filterId})`;
    }

    (imageProps as any).xlinkHref = imageSrc;

    return (
        <g className="pointer-events-none">
            <g transform={transform} opacity={opacity}>
                {defsChildren.length > 0 && <defs>{defsChildren}</defs>}
                <image {...imageProps} />
            </g>
        </g>
    );
});

const PathComponent: React.FC<{ rc: RoughSVG | null; data: AnyPath; }> = React.memo(({ rc, data }) => {
    if (data.tool === 'image') {
        return <ImagePath data={data as ImageData} />;
    }

    // 如果路径是常规（非遮罩）组，则递归渲染其子项以获得性能优势。
    if (data.tool === 'group' && !(data as GroupData).mask) {
        return (
            <g>
                {(data as GroupData).children.map(child => (
                    <PathComponent key={child.id} rc={rc} data={child} />
                ))}
            </g>
        );
    }

    // 对于原始路径和遮罩组，使用 `renderPathNode` 生成其 SVG 字符串。
    // 遮罩组需要作为一个整体进行渲染，以正确生成 <clipPath> 和相关结构。
    const nodeString = useMemo(() => {
        if (!rc) return '';
        const node = renderPathNode(rc, data);
        // 使用 outerHTML 确保整个节点都被正确序列化。
        return node ? node.outerHTML : '';
    }, [rc, data]);

    // 使用 dangerouslySetInnerHTML 来渲染预先计算好的 SVG 字符串。
    return <g className="pointer-events-none" dangerouslySetInnerHTML={{ __html: nodeString }} />;
});

/**
 * Renders a single non-group path using RoughJS.
 * This is optimized for live previews where we don't need group recursion or frame logic.
 */
export const RoughPath: React.FC<{ rc: RoughSVG | null; data: AnyPath; }> = React.memo(({ rc, data }) => {
    if (data.tool === 'image') {
        return <ImagePath data={data as ImageData} />;
    }

    const nodeString = useMemo(() => {
        if (!rc || data.tool === 'group') return '';
        const node = renderPathNode(rc, data);
        return node ? node.outerHTML : '';
    }, [rc, data]);

    // Use dangerouslySetInnerHTML to render the pre-computed SVG string.
    return <g className="pointer-events-none" dangerouslySetInnerHTML={{ __html: nodeString }} />;
});


interface PathsRendererProps {
  paths: AnyPath[];
  rc: RoughSVG | null;
  isBackground?: boolean;
}


/**
 * 负责渲染一组路径的主组件。
 * @description 它遍历顶层路径，并为每个路径渲染一个 `PathComponent`。
 * 递归由 `PathComponent` 内部处理。
 */
export const PathsRenderer: React.FC<PathsRendererProps> = React.memo(({ paths, rc, isBackground }) => {
  // 预先计算画框列表，以便在其上方渲染编号。
  const frames = useMemo(() => getAllFrames(paths), [paths]);
  return (
    <g opacity={isBackground ? 0.3 : 1} style={{ pointerEvents: isBackground ? 'none' : 'auto' }}>
      {paths.map((path) => (
        <PathComponent key={path.id} rc={rc} data={path} />
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