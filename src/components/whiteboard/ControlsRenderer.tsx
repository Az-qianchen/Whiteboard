/**
 * 本文件是 Whiteboard 的子组件，专门负责渲染选中图形的编辑控件。
 * 例如，它会绘制路径的锚点、控制手柄、尺寸调整手柄以及旋转手柄。
 */

import React, { useEffect, useState } from 'react';
import type { AnyPath, VectorPathData, RectangleData, EllipseData, Point, DragState, Tool, SelectionMode, ResizeHandlePosition, ImageData, PolygonData, GroupData, ArcData, TextData, FrameData, BBox } from '@/types';
import { getPathBoundingBox, getPathsBoundingBox, dist, getPathD, calculateArcPathD, rotateResizeHandle } from '@/lib/drawing';
import { applyMatrixToPoint, getShapeTransformMatrix, isIdentityMatrix, matrixToString } from '@/lib/drawing/transform/matrix';


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
    if (path.tool === 'rectangle' || path.tool === 'ellipse' || path.tool === 'image' || path.tool === 'polygon' || path.tool === 'text' || path.tool === 'frame') {
        const matrix = getShapeTransformMatrix(path as RectangleData | EllipseData | ImageData | PolygonData | TextData | FrameData);
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
    path: RectangleData | EllipseData | ImageData | PolygonData | TextData | FrameData;
    scale: number;
    isSelectedAlone: boolean;
    dragState: DragState | null;
    allowSkew: boolean;
}> = React.memo(({ path, scale, isSelectedAlone, dragState, allowSkew }) => {
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

                {isSelectedAlone && (path.tool === 'rectangle' || path.tool === 'image' || path.tool === 'polygon') && (() => {
                    const cornerPos = { x, y };
                    // Using a fixed screen-space offset makes it consistent regardless of zoom.
                    const handleOffset = 20 / scale; 
                    const unrotatedHandlePos = { x: cornerPos.x, y: cornerPos.y - handleOffset };
                    
                    const handlePos = transformPoint(unrotatedHandlePos);
                    const rotatedCornerPos = transformPoint(cornerPos);
                    
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

const MultiSelectionControls: React.FC<{ paths: AnyPath[], scale: number }> = React.memo(({ paths, scale }) => {
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

    return (
        <g className="pointer-events-auto">
            {paths.map(p => <PathHighlight key={p.id} path={p} scale={scale} isMultiSelect={true} />)}
            <rect x={bbox.x} y={bbox.y} width={bbox.width} height={bbox.height} fill="none" stroke={accent} strokeWidth={scaledStroke(1)} strokeDasharray={`${4 / scale} ${4 / scale}`} className="pointer-events-none" />
            <line x1={topCenter.x} y1={topCenter.y} x2={rotationHandlePos.x} y2={rotationHandlePos.y} stroke={accent} strokeWidth={scaledStroke(1)} strokeDasharray={`${2 / scale} ${2 / scale}`} className="pointer-events-none" />
            <circle cx={rotationHandlePos.x} cy={rotationHandlePos.y} r={5 / scale} fill="var(--text-primary)" stroke={accent} strokeWidth={scaledStroke(1)} data-handle="rotate" data-path-id={firstPathId} style={{ cursor: 'grab' }} className="pointer-events-all" />
            {handles.map(({ pos, name, cursor }) => (<rect key={name} x={pos.x - halfHandleSize} y={pos.y - halfHandleSize} width={handleSize} height={handleSize} fill="var(--text-primary)" stroke={accent} strokeWidth={scaledStroke(1)} data-handle={name} data-path-id={firstPathId} style={{ cursor }} className="pointer-events-all" />))}
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
          if (path.tool === 'rectangle' || path.tool === 'ellipse' || path.tool === 'image' || path.tool === 'polygon' || path.tool === 'text' || path.tool === 'frame') {
            return (
              <ShapeControls
                key={path.id}
                path={path}
                scale={scale}
                isSelectedAlone={selectedPaths.length === 1}
                dragState={dragState}
                allowSkew={false}
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
    if (selectedPaths.length === 1) {
        const selectedPath = selectedPaths[0];
        if ((selectedPath.tool === 'rectangle' || selectedPath.tool === 'ellipse' || selectedPath.tool === 'image' || selectedPath.tool === 'polygon' || selectedPath.tool === 'text' || selectedPath.tool === 'frame') && !selectedPath.isLocked) {
            return (
                <ShapeControls
                    path={selectedPath}
                    scale={scale}
                    isSelectedAlone={true}
                    dragState={dragState}
                    allowSkew={true}
                />
            );
        }
    }
    return <MultiSelectionControls paths={selectedPaths} scale={scale} />;
  }
  
  return null;
});