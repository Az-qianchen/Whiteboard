/**
 * 本文件是 Whiteboard 的子组件，专门负责渲染选中图形的编辑控件。
 * 例如，它会绘制路径的锚点、控制手柄、尺寸调整手柄以及旋转手柄。
 */

import React, { useEffect, useState } from 'react';
import type { AnyPath, VectorPathData, RectangleData, EllipseData, Point, DragState, Tool, SelectionMode, ResizeHandlePosition, ImageData, PolygonData, GroupData, ArcData, FrameData, BBox, TextData } from '@/types';
import { getPathBoundingBox, getPathsBoundingBox, dist, getPathD, calculateArcPathD, rotateResizeHandle } from '@/lib/drawing';
import { applyMatrixToPoint, getShapeTransformMatrix, isIdentityMatrix, matrixToString } from '@/lib/drawing/transform/matrix';
import { getLinearHandles } from '@/lib/gradient';
import { getGradientHandleSpace } from '@/lib/gradientHandles';


const VectorPathControls: React.FC<{ data: VectorPathData; scale: number; dragState: DragState | null; hoveredPoint: Point | null; }> = React.memo(({ data, scale, dragState, hoveredPoint }) => {
  const scaledStroke = (width: number) => Math.max(0.5, width / scale);
  const scaledRadius = (r: number) => Math.max(2, r / scale);
  const showHandles = data.tool !== 'line';

  const BASE_RADIUS = 5, HOVER_RADIUS = 8, HIT_RADIUS = 10, EXPLOSION_OFFSET = 12;

  const hoverRadius = HIT_RADIUS / scale, explosionOffset = EXPLOSION_OFFSET / scale;
  
  const accent = 'var(--accent-primary)';
  const accentMuted = 'var(--accent-primary-muted)';
  const accentHighlight = 'var(--accent-primary-highlight)';

  return (
    <g className="pointer-events-auto">
      {dragState && 'anchorIndex' in dragState && dragState.pathId === data.id && dragState.anchorIndex < data.anchors.length && (
        <>
          {dragState.type === 'anchor' && (<circle cx={data.anchors[dragState.anchorIndex].point.x} cy={data.anchors[dragState.anchorIndex].point.y} r={scaledRadius(10)} fill={accentHighlight} className="pointer-events-none" />)}
          {showHandles && (dragState.type === 'handleIn' || dragState.type === 'handleOut') && (<circle cx={dragState.type === 'handleIn' ? data.anchors[dragState.anchorIndex].handleIn.x : data.anchors[dragState.anchorIndex].handleOut.x} cy={dragState.type === 'handleIn' ? data.anchors[dragState.anchorIndex].handleIn.y : data.anchors[dragState.anchorIndex].handleOut.y} r={scaledRadius(10)} fill={accentHighlight} className="pointer-events-none" />)}
        </>
      )}
      {data.anchors.map((anchor, index) => {
        const isDraggingThis = dragState && 'anchorIndex' in dragState && dragState.pathId === data.id && dragState.anchorIndex === index;
        const canHover = !dragState || isDraggingThis;
        const isHandleInCollapsed = dist(anchor.point, anchor.handleIn) < 1;
        const isHandleOutCollapsed = dist(anchor.point, anchor.handleOut) < 1;
        let displayHandleIn = anchor.handleIn, displayHandleOut = anchor.handleOut, shouldExplode = false;

        if (showHandles && (isHandleInCollapsed || isHandleOutCollapsed)) {
            const explodedHandleIn = { x: anchor.point.x - explosionOffset, y: anchor.point.y };
            const explodedHandleOut = { x: anchor.point.x + explosionOffset, y: anchor.point.y };
            const hoverAreaRadius = hoverRadius * 1.5;
            const isHoveringGroup = canHover && hoveredPoint && (dist(anchor.point, hoveredPoint) < hoverAreaRadius || (isHandleInCollapsed && dist(explodedHandleIn, hoveredPoint) < hoverAreaRadius) || (isHandleOutCollapsed && dist(explodedHandleOut, hoveredPoint) < hoverAreaRadius));
            if (isHoveringGroup) {
                shouldExplode = true;
                if (isHandleInCollapsed) displayHandleIn = explodedHandleIn;
                if (isHandleOutCollapsed) displayHandleOut = explodedHandleOut;
            }
        }

        const isAnchorHovered = canHover && hoveredPoint && dist(anchor.point, hoveredPoint) < hoverRadius;
        const isDisplayHandleInHovered = showHandles && canHover && hoveredPoint && dist(displayHandleIn, hoveredPoint) < hoverRadius;
        const isDisplayHandleOutHovered = showHandles && canHover && hoveredPoint && dist(displayHandleOut, hoveredPoint) < hoverRadius;
        const isAnythingHoveredOnGroup = shouldExplode || isAnchorHovered || isDisplayHandleInHovered || isDisplayHandleOutHovered;
        const areHandlesVisible = (displayHandleIn.x !== anchor.point.x || displayHandleIn.y !== anchor.point.y || displayHandleOut.x !== anchor.point.x || displayHandleOut.y !== anchor.point.y);

        return (
          <g key={index}>
            {showHandles && areHandlesVisible && (
              <>
                <line x1={displayHandleIn.x} y1={displayHandleIn.y} x2={anchor.point.x} y2={anchor.point.y} stroke={isAnythingHoveredOnGroup ? accent : accentMuted} strokeWidth={scaledStroke(1)} className="pointer-events-none transition-colors duration-75" />
                <line x1={displayHandleOut.x} y1={displayHandleOut.y} x2={anchor.point.x} y2={anchor.point.y} stroke={isAnythingHoveredOnGroup ? accent : accentMuted} strokeWidth={scaledStroke(1)} className="pointer-events-none transition-colors duration-75" />
              </>
            )}
            {showHandles && <circle cx={displayHandleIn.x} cy={displayHandleIn.y} r={scaledRadius(isDisplayHandleInHovered ? HOVER_RADIUS : BASE_RADIUS)} fill="var(--text-primary)" stroke={isDisplayHandleInHovered ? accent : accentMuted} strokeWidth={scaledStroke(1.5)} data-type="handleIn" data-path-id={data.id} data-anchor-index={index} className="pointer-events-all cursor-move transition-colors duration-75" />}
            {showHandles && <circle cx={displayHandleOut.x} cy={displayHandleOut.y} r={scaledRadius(isDisplayHandleOutHovered ? HOVER_RADIUS : BASE_RADIUS)} fill="var(--text-primary)" stroke={isDisplayHandleOutHovered ? accent : accentMuted} strokeWidth={scaledStroke(1.5)} data-type="handleOut" data-path-id={data.id} data-anchor-index={index} className="pointer-events-all cursor-move transition-colors duration-75" />}
            <circle cx={anchor.point.x} cy={anchor.point.y} r={scaledRadius(isAnchorHovered ? HOVER_RADIUS : BASE_RADIUS)} fill={isAnchorHovered ? accent : accentMuted} stroke="var(--text-primary)" strokeWidth={scaledStroke(1.5)} data-type="anchor" data-path-id={data.id} data-anchor-index={index} className="pointer-events-all cursor-move transition-colors duration-75" />
          </g>
        );
      })}
    </g>
  );
});

const PathHighlight: React.FC<{ path: AnyPath; scale: number; isMultiSelect?: boolean }> = React.memo(({ path, scale, isMultiSelect = false }) => {
    if (path.tool === 'group') {
        return <g>{(path as GroupData).children.map(child => <PathHighlight key={child.id} path={child} scale={scale} isMultiSelect={isMultiSelect} />)}</g>;
    }

    const d = getPathD(path);
    if (!d) return null;

    let transform: string | undefined;
    if (path.tool === 'rectangle' || path.tool === 'ellipse' || path.tool === 'image' || path.tool === 'polygon' || path.tool === 'frame' || path.tool === 'text') {
      const matrix = getShapeTransformMatrix(path as RectangleData | EllipseData | ImageData | PolygonData | FrameData | TextData);
        if (!isIdentityMatrix(matrix)) {
            transform = matrixToString(matrix);
        }
    }

    const accent = 'var(--accent-primary)';
    const scaledStroke = (width: number) => Math.max(0.5, width / scale);
    const dashArray = isMultiSelect ? `${3 / scale} ${3 / scale}` : `${4 / scale} ${4 / scale}`;
    
    return (
        <path
            d={d}
            transform={transform}
            fill="none"
            stroke={accent}
            strokeOpacity={isMultiSelect ? "0.9" : "1"}
            strokeWidth={scaledStroke(1)}
            strokeDasharray={dashArray}
            className="pointer-events-none"
        />
    );
});


const DEFAULT_HANDLE_CURSORS: Record<ResizeHandlePosition, string> = {
    'top-left': 'nwse-resize',
    'top-right': 'nesw-resize',
    'bottom-left': 'nesw-resize',
    'bottom-right': 'nwse-resize',
    top: 'ns-resize',
    right: 'ew-resize',
    bottom: 'ns-resize',
    left: 'ew-resize',
};

const SKEW_HANDLE_CURSORS: Record<ResizeHandlePosition, string> = {
    'top-left': 'nesw-resize',
    'top-right': 'nwse-resize',
    'bottom-left': 'nwse-resize',
    'bottom-right': 'nesw-resize',
    top: 'ew-resize',
    right: 'ns-resize',
    bottom: 'ew-resize',
    left: 'ns-resize',
};

const getHandleCursor = (handle: ResizeHandlePosition, useSkewCursor: boolean) =>
    useSkewCursor ? SKEW_HANDLE_CURSORS[handle] : DEFAULT_HANDLE_CURSORS[handle];

const ShapeControls: React.FC<{
    path: RectangleData | EllipseData | ImageData | PolygonData | FrameData | TextData;
    scale: number;
    isSelectedAlone: boolean;
    dragState: DragState | null;
    allowSkew: boolean;
    showMeasurements?: boolean;
}> = React.memo(({ path, scale, isSelectedAlone, dragState, allowSkew, showMeasurements = false }) => {
    const { x, y, width, height } = path;

    const scaledStroke = (width: number) => Math.max(0.5, width / scale);
    const handleSize = 8 / scale;
    const halfHandleSize = handleSize / 2;
    const accent = 'var(--accent-primary)';

    const [isSkewModifierActive, setIsSkewModifierActive] = useState(false);

    useEffect(() => {
        if (!allowSkew) {
            setIsSkewModifierActive(false);
            return;
        }

        const handleKeyChange = (event: KeyboardEvent) => {
            const next = event.ctrlKey || event.metaKey;
            setIsSkewModifierActive(prev => (prev === next ? prev : next));
        };

        const handleBlur = () => {
            setIsSkewModifierActive(false);
        };

        window.addEventListener('keydown', handleKeyChange);
        window.addEventListener('keyup', handleKeyChange);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('keydown', handleKeyChange);
            window.removeEventListener('keyup', handleKeyChange);
            window.removeEventListener('blur', handleBlur);
        };
    }, [allowSkew]);

    const transformMatrix = getShapeTransformMatrix(path);
    const transformPoint = (point: Point) => applyMatrixToPoint(transformMatrix, point);

    const unrotatedHandles: { pos: Point; name: ResizeHandlePosition }[] = [
        { pos: { x, y }, name: 'top-left' },
        { pos: { x: x + width, y }, name: 'top-right' },
        { pos: { x, y: y + height }, name: 'bottom-left' },
        { pos: { x: x + width, y: y + height }, name: 'bottom-right' },
        { pos: { x: x + width / 2, y }, name: 'top' },
        { pos: { x: x + width, y: y + height / 2 }, name: 'right' },
        { pos: { x: x + width / 2, y: y + height }, name: 'bottom' },
        { pos: { x, y: y + height / 2 }, name: 'left' },
    ];

    const isSkewDragActive = allowSkew && dragState?.type === 'skew' && dragState.pathId === path.id;
    const useSkewCursor = allowSkew && (isSkewDragActive || isSkewModifierActive);

    const handles = unrotatedHandles.map(handle => ({
        ...handle,
        pos: transformPoint(handle.pos),
        cursor: getHandleCursor(handle.name, useSkewCursor),
    }));

    const rotationHandleOffset = 20 / scale;
    const topCenterUnrotated = { x: x + width / 2, y };
    const rotationHandlePosUnrotated = { x: topCenterUnrotated.x, y: topCenterUnrotated.y - rotationHandleOffset };
    const topCenter = transformPoint(topCenterUnrotated);
    const rotationHandlePos = transformPoint(rotationHandlePosUnrotated);

    const labelHeight = LABEL_FONT_SIZE + LABEL_PADDING_Y * 2;
    const handleLabelOffsetWorld = (HANDLE_LABEL_OFFSET_PX + labelHeight / 2) / scale;

    let rotationHandleLabel: React.ReactNode = null;
    if (showMeasurements && typeof path.rotation === 'number') {
        const handleVec = { x: rotationHandlePos.x - topCenter.x, y: rotationHandlePos.y - topCenter.y };
        const handleLength = Math.hypot(handleVec.x, handleVec.y);
        const handleUnit = handleLength > 0.0001 ? { x: handleVec.x / handleLength, y: handleVec.y / handleLength } : { x: 0, y: -1 };

        const labelCenter = {
            x: rotationHandlePos.x + handleUnit.x * handleLabelOffsetWorld,
            y: rotationHandlePos.y + handleUnit.y * handleLabelOffsetWorld,
        };

        rotationHandleLabel = (
            <LabelPill
                text={formatRotationValue(path.rotation ?? 0)}
                position={labelCenter}
                rotation={0}
                scale={scale}
            />
        );
    }

    return (
        <g className="pointer-events-auto">
            <PathHighlight path={path} scale={scale} />
            {handles.map(({ pos, name, cursor }) => (
                <rect
                    key={name}
                    x={pos.x - halfHandleSize}
                    y={pos.y - halfHandleSize}
                    width={handleSize}
                    height={handleSize}
                    fill={"var(--text-primary)"}
                    stroke={accent}
                    strokeWidth={scaledStroke(1)}
                    data-handle={name}
                    data-path-id={path.id}
                    style={{ cursor }}
                    className="pointer-events-all"
                />
            ))}
            
            <>
                <line x1={topCenter.x} y1={topCenter.y} x2={rotationHandlePos.x} y2={rotationHandlePos.y} stroke={accent} strokeWidth={scaledStroke(1)} strokeDasharray={`${2 / scale} ${2 / scale}`} className="pointer-events-none" />
                <circle cx={rotationHandlePos.x} cy={rotationHandlePos.y} r={5 / scale} fill="var(--text-primary)" stroke={accent} strokeWidth={scaledStroke(1)} data-handle="rotate" data-path-id={path.id} style={{ cursor: 'grab' }} className="pointer-events-all" />

                {rotationHandleLabel}

                {isSelectedAlone && (path.tool === 'rectangle' || path.tool === 'image' || path.tool === 'polygon') && (() => {
                    const cornerPos = { x, y };
                    // Using a fixed screen-space offset makes it consistent regardless of zoom.
                    const handleOffset = 20 / scale;
                    const unrotatedHandlePos = { x: cornerPos.x, y: cornerPos.y - handleOffset };

                    const handlePos = transformPoint(unrotatedHandlePos);
                    const rotatedCornerPos = transformPoint(cornerPos);

                    const handleDirection = {
                        x: handlePos.x - rotatedCornerPos.x,
                        y: handlePos.y - rotatedCornerPos.y,
                    };
                    const handleLength = Math.hypot(handleDirection.x, handleDirection.y);
                    const handleUnit = handleLength > 0.0001
                        ? { x: handleDirection.x / handleLength, y: handleDirection.y / handleLength }
                        : { x: 0, y: -1 };

                    const cornerRadiusValue = 'borderRadius' in path ? Math.max(0, path.borderRadius ?? 0) : 0;
                    const cornerLabelCenter = {
                        x: handlePos.x + handleUnit.x * handleLabelOffsetWorld,
                        y: handlePos.y + handleUnit.y * handleLabelOffsetWorld,
                    };

                    return (
                        <>
                            <line
                                x1={rotatedCornerPos.x} y1={rotatedCornerPos.y}
                                x2={handlePos.x} y2={handlePos.y}
                                stroke="var(--accent-primary)" 
                                strokeWidth={1/scale} 
                                strokeDasharray={`${2/scale} ${2/scale}`} 
                                className="pointer-events-none" 
                            />
                            <circle 
                                cx={handlePos.x} cy={handlePos.y} 
                                r={5 / scale} 
                                fill="var(--accent-primary)" 
                                stroke="var(--text-primary)" 
                                strokeWidth={1 / scale} 
                                data-handle="border-radius" 
                                data-path-id={path.id}
                                style={{ cursor: 'ew-resize' }}
                                className="pointer-events-all"
                            />
                            {showMeasurements && (
                                <LabelPill
                                    text={`R ${formatDimensionValue(cornerRadiusValue)}`}
                                    position={cornerLabelCenter}
                                    rotation={0}
                                    scale={scale}
                                />
                            )}
                        </>
                    );
                })()}
            </>
        </g>
    );
});

const CropControls: React.FC<{
    croppingState: { pathId: string; originalPath: ImageData; };
    currentCropRect: BBox;
    scale: number;
}> = React.memo(({ croppingState, currentCropRect, scale }) => {
    const o = croppingState.originalPath;
    const c = currentCropRect;

    const rotation = o.rotation ?? 0;
    const rotationCenter = { x: o.x + o.width / 2, y: o.y + o.height / 2 };
    const rotationAngle = rotation * (180 / Math.PI);
    const transform = `rotate(${rotationAngle} ${rotationCenter.x} ${rotationCenter.y})`;

    const handleSize = 10 / scale;
    const halfHandleSize = handleSize / 2;
    const accent = 'var(--accent-primary)';

    const baseHandles: { pos: Point; name: ResizeHandlePosition }[] = [
        { pos: { x: c.x, y: c.y }, name: 'top-left' },
        { pos: { x: c.x + c.width, y: c.y }, name: 'top-right' },
        { pos: { x: c.x, y: c.y + c.height }, name: 'bottom-left' },
        { pos: { x: c.x + c.width, y: c.y + c.height }, name: 'bottom-right' },
        { pos: { x: c.x + c.width / 2, y: c.y }, name: 'top' },
        { pos: { x: c.x + c.width, y: c.y + c.height / 2 }, name: 'right' },
        { pos: { x: c.x + c.width / 2, y: c.y + c.height }, name: 'bottom' },
        { pos: { x: c.x, y: c.y + c.height / 2 }, name: 'left' },
    ];

    const cursorMap: Record<ResizeHandlePosition, string> = {
        'top-left': 'nwse-resize',
        'top-right': 'nesw-resize',
        'bottom-left': 'nesw-resize',
        'bottom-right': 'nwse-resize',
        'top': 'ns-resize',
        'bottom': 'ns-resize',
        'left': 'ew-resize',
        'right': 'ew-resize',
    };

    const handles = baseHandles.map(h => {
        const screenName = rotateResizeHandle(h.name, rotation);
        return { pos: h.pos, handle: h.name, cursor: cursorMap[screenName] };
    });

    const strokeWidth = 1 / scale;
    const cornerStrokeWidth = 3 / scale;
    const cornerLineLength = Math.min(15 / scale, c.width/3, c.height/3);

    return (
        <g transform={transform} className="pointer-events-auto">
            <rect
                x={c.x} y={c.y} width={c.width} height={c.height}
                fill="none" stroke="rgba(255, 255, 255, 0.5)"
                strokeWidth={strokeWidth}
            />

            <path d={`M ${c.x + cornerLineLength} ${c.y} L ${c.x} ${c.y} L ${c.x} ${c.y + cornerLineLength}`} fill="none" stroke={accent} strokeWidth={cornerStrokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <path d={`M ${c.x + c.width - cornerLineLength} ${c.y} L ${c.x + c.width} ${c.y} L ${c.x + c.width} ${c.y + cornerLineLength}`} fill="none" stroke={accent} strokeWidth={cornerStrokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <path d={`M ${c.x + cornerLineLength} ${c.y + c.height} L ${c.x} ${c.y + c.height} L ${c.x} ${c.y + c.height - cornerLineLength}`} fill="none" stroke={accent} strokeWidth={cornerStrokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <path d={`M ${c.x + c.width - cornerLineLength} ${c.y + c.height} L ${c.x + c.width} ${c.y + c.height} L ${c.x + c.width} ${c.y + c.height - cornerLineLength}`} fill="none" stroke={accent} strokeWidth={cornerStrokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            
            {handles.map(({ pos, handle, cursor }) => (
                <rect key={handle} x={pos.x - halfHandleSize} y={pos.y - halfHandleSize} width={handleSize} height={handleSize} fill="transparent" data-handle={handle} data-path-id={o.id} style={{ cursor }} className="pointer-events-all" />
            ))}
        </g>
    );
});


const ArcControls: React.FC<{ data: ArcData; scale: number; }> = React.memo(({ data, scale }) => {
  const accent = 'var(--accent-primary)';
  const scaledStroke = (width: number) => Math.max(0.5, width / scale);
  const handleRadius = 5 / scale;

  const [start, end, via] = data.points;

  const d = calculateArcPathD(start, end, via);
  if (!d) return null; // Can't draw controls if arc is invalid (collinear)

  return (
    <g className="pointer-events-auto">
      {/* Highlight path */}
      <path
        d={d}
        fill="none"
        stroke={accent}
        strokeOpacity="0.7"
        strokeWidth={scaledStroke(1.5)}
        strokeDasharray={`${4 / scale} ${4 / scale}`}
        className="pointer-events-none"
      />

      {/* Control Handles */}
      <circle cx={start.x} cy={start.y} r={handleRadius} fill="var(--text-primary)" stroke={accent} strokeWidth={scaledStroke(1.5)} data-handle="arc" data-path-id={data.id} data-point-index="0" style={{ cursor: 'move' }} className="pointer-events-all" />
      <circle cx={end.x} cy={end.y} r={handleRadius} fill="var(--text-primary)" stroke={accent} strokeWidth={scaledStroke(1.5)} data-handle="arc" data-path-id={data.id} data-point-index="1" style={{ cursor: 'move' }} className="pointer-events-all" />
      <circle cx={via.x} cy={via.y} r={handleRadius} fill="var(--accent-primary)" stroke="var(--text-primary)" strokeWidth={scaledStroke(1.5)} data-handle="arc" data-path-id={data.id} data-point-index="2" style={{ cursor: 'move' }} className="pointer-events-all" />
    </g>
  );
});

const GradientHandles: React.FC<{ path: AnyPath; scale: number }> = React.memo(({ path, scale }) => {
  const gradient = path.fillGradient;
  if (!gradient) return null;
  if (path.isLocked) return null;

  const space = getGradientHandleSpace(path);
  if (!space) return null;

  const accent = 'var(--accent-primary)';
  const accentMuted = 'var(--accent-primary-muted)';
  const accentHighlight = 'var(--accent-primary-highlight)';
  const handleRadius = 5 / scale;
  const connectionStroke = Math.max(0.75 / scale, 0.5);

  if (gradient.type === 'linear') {
    const [startHandle, endHandle] = getLinearHandles(gradient);
    const startPos = space.toCanvas(startHandle);
    const endPos = space.toCanvas(endHandle);
    if (!startPos || !endPos) {
      return null;
    }

    return (
      <g className="pointer-events-auto">
        <line
          x1={startPos.x}
          y1={startPos.y}
          x2={endPos.x}
          y2={endPos.y}
          stroke={accentMuted}
          strokeWidth={connectionStroke}
          strokeDasharray={`${4 / scale} ${4 / scale}`}
          className="pointer-events-none"
        />
        <circle
          cx={startPos.x}
          cy={startPos.y}
          r={handleRadius}
          fill={accentHighlight}
          stroke="var(--text-primary)"
          strokeWidth={Math.max(1 / scale, 0.75)}
          data-gradient-handle="start"
          data-path-id={path.id}
          className="pointer-events-all cursor-move"
        />
        <circle
          cx={endPos.x}
          cy={endPos.y}
          r={handleRadius}
          fill="var(--text-primary)"
          stroke={accent}
          strokeWidth={Math.max(1 / scale, 0.75)}
          data-gradient-handle="end"
          data-path-id={path.id}
          className="pointer-events-all cursor-move"
        />
      </g>
    );
  }

  const centerPos = space.toCanvas(gradient.center);
  const edgePos = space.toCanvas(gradient.edge);
  if (!centerPos || !edgePos) {
    return null;
  }

  const radius = Math.hypot(edgePos.x - centerPos.x, edgePos.y - centerPos.y);

  return (
    <g className="pointer-events-auto">
      {radius > 0.0001 && (
        <circle
          cx={centerPos.x}
          cy={centerPos.y}
          r={radius}
          fill="none"
          stroke={accentMuted}
          strokeWidth={Math.max(0.5 / scale, 0.4)}
          strokeDasharray={`${4 / scale} ${4 / scale}`}
          className="pointer-events-none"
        />
      )}
      <line
        x1={centerPos.x}
        y1={centerPos.y}
        x2={edgePos.x}
        y2={edgePos.y}
        stroke={accent}
        strokeWidth={connectionStroke}
        className="pointer-events-none"
      />
      <circle
        cx={centerPos.x}
        cy={centerPos.y}
        r={handleRadius}
        fill={accentHighlight}
        stroke="var(--text-primary)"
        strokeWidth={Math.max(1 / scale, 0.75)}
        data-gradient-handle="center"
        data-path-id={path.id}
        className="pointer-events-all cursor-move"
      />
      <circle
        cx={edgePos.x}
        cy={edgePos.y}
        r={handleRadius}
        fill="var(--text-primary)"
        stroke={accent}
        strokeWidth={Math.max(1 / scale, 0.75)}
        data-gradient-handle="edge"
        data-path-id={path.id}
        className="pointer-events-all cursor-move"
      />
    </g>
  );
});

const LABEL_FONT_SIZE = 12;
const LABEL_FONT_WEIGHT = 600;
const LABEL_FONT_FAMILY = 'Inter, system-ui, sans-serif';
const LABEL_FONT = `${LABEL_FONT_WEIGHT} ${LABEL_FONT_SIZE}px ${LABEL_FONT_FAMILY}`;
const LABEL_PADDING_X = 10;
const LABEL_PADDING_Y = 4;
const LABEL_OFFSET_PX = 12;
const HANDLE_LABEL_OFFSET_PX = 8;

type DimensionGuide = {
  width: number;
  height: number;
  anchor: Point;
  normal: Point;
  angle: number;
  rotation?: number;
  cornerRadius?: number;
};

const measureTextWidth = (() => {
  let canvas: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;
  return (text: string, font: string) => {
    if (typeof document === 'undefined') {
      return text.length * 7;
    }
    if (!canvas) {
      canvas = document.createElement('canvas');
      context = canvas.getContext('2d');
    }
    if (!context) {
      return text.length * 7;
    }
    context.font = font;
    return context.measureText(text).width;
  };
})();

const formatDimensionValue = (value: number) => {
  if (!isFinite(value)) {
    return '0';
  }
  const absolute = Math.abs(value);
  const rounded = Math.round(absolute * 100) / 100;
  if (rounded < 0.01) {
    return '0';
  }
  const fixed = rounded.toFixed(2);
  return fixed.replace(/\.00$/, '').replace(/(\.\d*[1-9])0$/, '$1');
};

const formatRotationValue = (radians: number) => {
  const degrees = (radians * 180) / Math.PI;
  let normalized = ((degrees + 180) % 360 + 360) % 360 - 180;
  if (Math.abs(normalized) < 0.01) {
    normalized = 0;
  }
  const rounded = Math.round(normalized * 100) / 100;
  if (Math.abs(rounded) < 0.01) {
    return '0°';
  }
  const magnitude = formatDimensionValue(Math.abs(rounded));
  const sign = rounded < 0 ? '-' : '';
  return `${sign}${magnitude}°`;
};

const buildDimensionLabelText = (guide: DimensionGuide) =>
  `${formatDimensionValue(Math.max(0, guide.width))} × ${formatDimensionValue(Math.max(0, guide.height))}`;

const createDimensionGuide = (
  width: number,
  height: number,
  anchor: Point,
  normal: Point,
  angle: number,
  extras: Partial<Pick<DimensionGuide, 'rotation' | 'cornerRadius'>> = {},
): DimensionGuide => ({
  width,
  height,
  anchor,
  normal,
  angle,
  ...extras,
});

const averageNonZero = (values: number[]) => {
  const positives = values.map(Math.abs).filter(v => v > 0.0001);
  if (positives.length === 0) {
    return 0;
  }
  const sum = positives.reduce((acc, curr) => acc + curr, 0);
  return sum / positives.length;
};

const getGuideForTransformableShape = (
  path: RectangleData | EllipseData | ImageData | PolygonData | FrameData,
): DimensionGuide => {
  const { x, y, width, height } = path;
  const matrix = getShapeTransformMatrix(path);
  const corners = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ].map(point => applyMatrixToPoint(matrix, point));

  const [topLeft, topRight, bottomRight, bottomLeft] = corners;

  const topEdgeVec = { x: topRight.x - topLeft.x, y: topRight.y - topLeft.y };
  const bottomEdgeVec = { x: bottomRight.x - bottomLeft.x, y: bottomRight.y - bottomLeft.y };
  const leftEdgeVec = { x: bottomLeft.x - topLeft.x, y: bottomLeft.y - topLeft.y };
  const rightEdgeVec = { x: bottomRight.x - topRight.x, y: bottomRight.y - topRight.y };

  const widthValue = averageNonZero([
    Math.hypot(topEdgeVec.x, topEdgeVec.y),
    Math.hypot(bottomEdgeVec.x, bottomEdgeVec.y),
  ]);

  const heightValue = averageNonZero([
    Math.hypot(leftEdgeVec.x, leftEdgeVec.y),
    Math.hypot(rightEdgeVec.x, rightEdgeVec.y),
  ]);

  const edgeForOrientation = Math.hypot(bottomEdgeVec.x, bottomEdgeVec.y) > 0.0001 ? bottomEdgeVec : topEdgeVec;
  const edgeLength = Math.hypot(edgeForOrientation.x, edgeForOrientation.y);
  const angle = edgeLength > 0.0001 ? Math.atan2(edgeForOrientation.y, edgeForOrientation.x) : 0;
  const normal = edgeLength > 0.0001
    ? { x: -edgeForOrientation.y / edgeLength, y: edgeForOrientation.x / edgeLength }
    : { x: 0, y: 1 };

  const anchor = {
    x: (bottomLeft.x + bottomRight.x) / 2,
    y: (bottomLeft.y + bottomRight.y) / 2,
  };

  const cornerRadius =
    path.tool === 'rectangle' || path.tool === 'polygon'
      ? path.borderRadius ?? 0
      : undefined;

  return createDimensionGuide(
    widthValue,
    heightValue,
    anchor,
    normal,
    angle,
    {
      rotation: path.rotation ?? 0,
      cornerRadius,
    },
  );
};

const getGuideFromBBox = (
  bbox: BBox | null,
  extras: Partial<Pick<DimensionGuide, 'rotation' | 'cornerRadius'>> = {},
): DimensionGuide | null => {
  if (!bbox) {
    return null;
  }
  const anchor = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height };
  const normal = { x: 0, y: 1 };
  return createDimensionGuide(bbox.width, bbox.height, anchor, normal, 0, extras);
};

const getGuideForPath = (path: AnyPath): DimensionGuide | null => {
  switch (path.tool) {
    case 'rectangle':
    case 'ellipse':
    case 'image':
    case 'polygon':
    case 'frame':
      return getGuideForTransformableShape(path);
    default:
      return getGuideFromBBox(
        getPathBoundingBox(path, false),
        { rotation: path.rotation ?? 0 },
      );
  }
};

const getDimensionGuide = (paths: AnyPath[]): DimensionGuide | null => {
  if (!paths || paths.length === 0) {
    return null;
  }
  if (paths.length === 1) {
    return getGuideForPath(paths[0]);
  }
  return getGuideFromBBox(getPathsBoundingBox(paths, false));
};

type LabelPillProps = {
  text: string;
  position: Point;
  scale: number;
  rotation?: number;
};

const LabelPill: React.FC<LabelPillProps> = React.memo(({ text, position, scale, rotation = 0 }) => {
  const textWidth = React.useMemo(() => measureTextWidth(text, LABEL_FONT), [text]);
  const labelWidth = textWidth + LABEL_PADDING_X * 2;
  const labelHeight = LABEL_FONT_SIZE + LABEL_PADDING_Y * 2;
  const safeScale = Math.max(scale, 0.0001);
  const rotationDeg = (rotation * 180) / Math.PI;

  return (
    <g
      transform={`translate(${position.x} ${position.y}) rotate(${rotationDeg}) scale(${1 / safeScale})`}
      className="pointer-events-none select-none"
    >
      <rect
        x={-labelWidth / 2}
        y={-labelHeight / 2}
        width={labelWidth}
        height={labelHeight}
        rx={labelHeight / 2}
        ry={labelHeight / 2}
        fill="var(--accent-primary)"
        stroke="var(--text-primary)"
        strokeOpacity={0.25}
      />
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={LABEL_FONT_SIZE}
        fontFamily={LABEL_FONT_FAMILY}
        fontWeight={LABEL_FONT_WEIGHT}
        fill="var(--text-on-accent-solid)"
      >
        {text}
      </text>
    </g>
  );
});

const DimensionLabel: React.FC<{ guide: DimensionGuide; scale: number }> = React.memo(({ guide, scale }) => {
  const labelText = React.useMemo(() => buildDimensionLabelText(guide), [guide.width, guide.height]);
  const labelHeight = LABEL_FONT_SIZE + LABEL_PADDING_Y * 2;
  const safeScale = Math.max(scale, 0.0001);

  const normalLength = Math.hypot(guide.normal.x, guide.normal.y);
  const normal = normalLength > 0.0001
    ? { x: guide.normal.x / normalLength, y: guide.normal.y / normalLength }
    : { x: 0, y: 1 };

  let rotationRad = guide.angle;
  if (Math.abs(rotationRad) > Math.PI / 2) {
    rotationRad = rotationRad > 0 ? rotationRad - Math.PI : rotationRad + Math.PI;
  }

  const offsetWorld = (LABEL_OFFSET_PX + labelHeight / 2) / safeScale;
  const anchorX = guide.anchor.x + normal.x * offsetWorld;
  const anchorY = guide.anchor.y + normal.y * offsetWorld;

  return (
    <LabelPill
      text={labelText}
      position={{ x: anchorX, y: anchorY }}
      rotation={rotationRad}
      scale={scale}
    />
  );
});

const MultiSelectionControls: React.FC<{
    paths: AnyPath[];
    scale: number;
    showMeasurements?: boolean;
    rotationValue?: number | null;
}> = React.memo(({ paths, scale, showMeasurements = false, rotationValue }) => {
    const bbox = getPathsBoundingBox(paths, false);
    if (!bbox) return null;
    const accent = 'var(--accent-primary)';
    const scaledStroke = (width: number) => Math.max(0.5, width / scale);
    const handleSize = 8 / scale, halfHandleSize = handleSize / 2, rotationHandleOffset = 20 / scale;
    const handles: { pos: Point, name: ResizeHandlePosition, cursor: string }[] = [];
    const { x, y, width, height } = bbox;
    handles.push({ pos: { x, y }, name: 'top-left', cursor: 'nwse-resize' }, { pos: { x: x + width, y }, name: 'top-right', cursor: 'nesw-resize' }, { pos: { x, y: y + height }, name: 'bottom-left', cursor: 'nesw-resize' }, { pos: { x: x + width, y: y + height }, name: 'bottom-right', cursor: 'nwse-resize' }, { pos: { x: x + width / 2, y }, name: 'top', cursor: 'ns-resize' }, { pos: { x: x + width, y: y + height / 2 }, name: 'right', cursor: 'ew-resize' }, { pos: { x: x + width / 2, y: y + height }, name: 'bottom', cursor: 'ns-resize' }, { pos: { x, y: y + height / 2 }, name: 'left', cursor: 'ew-resize' });
    const topCenter = { x: x + width / 2, y: y };
    const rotationHandlePos = { x: topCenter.x, y: topCenter.y - rotationHandleOffset };
    const firstPathId = paths[0]?.id;

    const labelHeight = LABEL_FONT_SIZE + LABEL_PADDING_Y * 2;
    const handleLabelOffsetWorld = (HANDLE_LABEL_OFFSET_PX + labelHeight / 2) / scale;

    let rotationHandleLabel: React.ReactNode = null;
    if (showMeasurements && typeof rotationValue === 'number') {
        const handleVec = { x: rotationHandlePos.x - topCenter.x, y: rotationHandlePos.y - topCenter.y };
        const handleLength = Math.hypot(handleVec.x, handleVec.y);
        const handleUnit = handleLength > 0.0001 ? { x: handleVec.x / handleLength, y: handleVec.y / handleLength } : { x: 0, y: -1 };

        const labelCenter = {
            x: rotationHandlePos.x + handleUnit.x * handleLabelOffsetWorld,
            y: rotationHandlePos.y + handleUnit.y * handleLabelOffsetWorld,
        };

        rotationHandleLabel = (
            <LabelPill
                text={formatRotationValue(rotationValue)}
                position={labelCenter}
                rotation={0}
                scale={scale}
            />
        );
    }

    return (
        <g className="pointer-events-auto">
            {paths.map(p => <PathHighlight key={p.id} path={p} scale={scale} isMultiSelect={true} />)}
            <rect x={bbox.x} y={bbox.y} width={bbox.width} height={bbox.height} fill="none" stroke={accent} strokeWidth={scaledStroke(1)} strokeDasharray={`${4 / scale} ${4 / scale}`} className="pointer-events-none" />
            <line x1={topCenter.x} y1={topCenter.y} x2={rotationHandlePos.x} y2={rotationHandlePos.y} stroke={accent} strokeWidth={scaledStroke(1)} strokeDasharray={`${2 / scale} ${2 / scale}`} className="pointer-events-none" />
            <circle cx={rotationHandlePos.x} cy={rotationHandlePos.y} r={5 / scale} fill="var(--text-primary)" stroke={accent} strokeWidth={scaledStroke(1)} data-handle="rotate" data-path-id={firstPathId} style={{ cursor: 'grab' }} className="pointer-events-all" />
            {rotationHandleLabel}
            {handles.map(({ pos, name, cursor }) => (
                <rect
                    key={name}
                    x={pos.x - halfHandleSize}
                    y={pos.y - halfHandleSize}
                    width={handleSize}
                    height={handleSize}
                    fill="var(--text-primary)"
                    stroke={accent}
                    strokeWidth={scaledStroke(1)}
                    data-handle={name}
                    data-path-id={firstPathId}
                    style={{ cursor }}
                    className="pointer-events-all"
                />
            ))}
        </g>
    );
});

interface ControlsRendererProps {
  tool: Tool;
  selectionMode: SelectionMode;
  selectedPaths: AnyPath[];
  currentPenPath: VectorPathData | null;
  currentLinePath: VectorPathData | null;
  scale: number;
  dragState: DragState | null;
  hoveredPoint: Point | null;
  croppingState: { pathId: string; originalPath: ImageData; } | null;
  currentCropRect: BBox | null;
  cropTool: 'crop' | 'magic-wand';
}

export const ControlsRenderer: React.FC<ControlsRendererProps> = React.memo(({
  tool,
  selectionMode,
  selectedPaths,
  currentPenPath,
  currentLinePath,
  scale,
  dragState,
  hoveredPoint,
  croppingState,
  currentCropRect,
  cropTool,
}) => {
  // Render controls for a path that is currently being drawn (pen or line)
  if (currentPenPath) {
    return <VectorPathControls data={currentPenPath} scale={scale} dragState={dragState} hoveredPoint={hoveredPoint} />;
  }
  if (currentLinePath) {
    return <VectorPathControls data={currentLinePath} scale={scale} dragState={dragState} hoveredPoint={hoveredPoint} />;
  }
  
  // Nothing to render if selection tool isn't active or nothing is selected
  if (tool !== 'selection' || selectedPaths.length === 0) {
    return null;
  }

  // Crop mode logic
  if (cropTool === 'crop' && croppingState && currentCropRect && selectedPaths.length === 1 && selectedPaths[0].id === croppingState.pathId) {
    const path = selectedPaths[0];
    if (path.tool === 'image') {
      return <CropControls croppingState={croppingState} currentCropRect={currentCropRect} scale={scale} />;
    }
  }

  // Edit mode logic
  if (selectionMode === 'edit') {
    // Render controls for all selected editable paths simultaneously.
    return (
      <g>
        {selectedPaths.map(path => {
          if (path.tool === 'pen' || path.tool === 'line') {
            return <VectorPathControls key={path.id} data={path as VectorPathData} scale={scale} dragState={dragState} hoveredPoint={hoveredPoint} />;
          }
          if (path.tool === 'rectangle' || path.tool === 'ellipse' || path.tool === 'image' || path.tool === 'polygon' || path.tool === 'frame' || path.tool === 'text') {
            return (
              <ShapeControls
                key={path.id}
                path={path}
                scale={scale}
                isSelectedAlone={selectedPaths.length === 1}
                dragState={dragState}
                allowSkew={path.tool !== 'text'}
              />
            );
          }
          if (path.tool === 'arc') {
            return <ArcControls key={path.id} data={path as ArcData} scale={scale} />;
          }
          // For groups or other non-directly-editable types in edit mode, just show a highlight.
          return <PathHighlight key={path.id} path={path} scale={scale} isMultiSelect={true} />;
        })}
      </g>
    );
  }

  // Move/transform mode logic
  if (selectionMode === 'move') {
    const dimensionGuide = getDimensionGuide(selectedPaths);
    const dimensionLabel = dimensionGuide ? (
      <DimensionLabel guide={dimensionGuide} scale={scale} />
    ) : null;

    if (selectedPaths.length === 1) {
        const selectedPath = selectedPaths[0];
        const gradientHandles = selectedPath.fillGradient ? (
          <GradientHandles path={selectedPath} scale={scale} />
        ) : null;

        if ((selectedPath.tool === 'rectangle' || selectedPath.tool === 'ellipse' || selectedPath.tool === 'image' || selectedPath.tool === 'polygon' || selectedPath.tool === 'frame' || selectedPath.tool === 'text') && !selectedPath.isLocked) {
            return (
                <>
                    <ShapeControls
                        path={selectedPath}
                        scale={scale}
                        isSelectedAlone={true}
                        dragState={dragState}
                        allowSkew={selectedPath.tool !== 'text'}
                        showMeasurements={true}
                    />
                    {gradientHandles}
                    {dimensionLabel}
                </>
            );
        }

        return (
            <>
                <MultiSelectionControls
                    paths={selectedPaths}
                    scale={scale}
                    showMeasurements={true}
                    rotationValue={dimensionGuide?.rotation ?? null}
                />
                {gradientHandles}
                {dimensionLabel}
            </>
        );
    }
    return (
      <>
        <MultiSelectionControls
          paths={selectedPaths}
          scale={scale}
          showMeasurements={true}
          rotationValue={dimensionGuide?.rotation ?? null}
        />
        {dimensionLabel}
      </>
    );
  }

  return null;
});
