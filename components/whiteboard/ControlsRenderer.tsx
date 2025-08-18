/**
 * 本文件是 Whiteboard 的子组件，专门负责渲染选中图形的编辑控件。
 * 例如，它会绘制路径的锚点、控制手柄、尺寸调整手柄以及旋转手柄。
 */

import React from 'react';
import type { AnyPath, VectorPathData, RectangleData, EllipseData, Point, DragState, Tool, SelectionMode, ResizeHandlePosition, ImageData, PolygonData } from '../../types';
import { getPathBoundingBox, getPathsBoundingBox, dist } from '../../lib/drawing';


const VectorPathControls: React.FC<{ data: VectorPathData; scale: number; dragState: DragState | null; hoveredPoint: Point | null; }> = React.memo(({ data, scale, dragState, hoveredPoint }) => {
  const scaledStroke = (width: number) => Math.max(0.5, width / scale);
  const scaledRadius = (r: number) => Math.max(2, r / scale);
  const showHandles = data.tool !== 'line';

  const BASE_RADIUS = 5, HOVER_RADIUS = 8, HIT_RADIUS = 10, EXPLOSION_OFFSET = 12;

  const hoverRadius = HIT_RADIUS / scale, explosionOffset = EXPLOSION_OFFSET / scale;
  
  // UPDATED: New color scheme for better visibility
  const accent = '#3B82F6'; // Tailwind blue-500
  const accentMuted = 'rgba(59, 130, 246, 0.6)';
  const accentHighlight = 'rgba(59, 130, 246, 0.25)';

  return (
    <g className="pointer-events-auto">
      {dragState && 'anchorIndex' in dragState && dragState.pathId === data.id && dragState.anchorIndex < data.anchors.length && (
        <>
          {/* UPDATED: Use new highlight color */}
          {dragState.type === 'anchor' && (<circle cx={data.anchors[dragState.anchorIndex].point.x} cy={data.anchors[dragState.anchorIndex].point.y} r={scaledRadius(10)} fill={accentHighlight} className="pointer-events-none" />)}
          {/* UPDATED: Use new highlight color */}
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
                {/* UPDATED: Brighter handle lines */}
                <line x1={displayHandleIn.x} y1={displayHandleIn.y} x2={anchor.point.x} y2={anchor.point.y} stroke={isAnythingHoveredOnGroup ? accent : accentMuted} strokeWidth={scaledStroke(1)} className="pointer-events-none transition-colors duration-75" />
                <line x1={displayHandleOut.x} y1={displayHandleOut.y} x2={anchor.point.x} y2={anchor.point.y} stroke={isAnythingHoveredOnGroup ? accent : accentMuted} strokeWidth={scaledStroke(1)} className="pointer-events-none transition-colors duration-75" />
              </>
            )}
            {/* UPDATED: Brighter handle strokes */}
            {showHandles && <circle cx={displayHandleIn.x} cy={displayHandleIn.y} r={scaledRadius(isDisplayHandleInHovered ? HOVER_RADIUS : BASE_RADIUS)} fill={isDisplayHandleInHovered ? "white" : "rgba(255, 255, 255, 0.9)"} stroke={isDisplayHandleInHovered ? accent : accentMuted} strokeWidth={scaledStroke(1.5)} data-type="handleIn" data-path-id={data.id} data-anchor-index={index} className="pointer-events-all cursor-move transition-colors duration-75" />}
            {showHandles && <circle cx={displayHandleOut.x} cy={displayHandleOut.y} r={scaledRadius(isDisplayHandleOutHovered ? HOVER_RADIUS : BASE_RADIUS)} fill={isDisplayHandleOutHovered ? "white" : "rgba(255, 255, 255, 0.9)"} stroke={isDisplayHandleOutHovered ? accent : accentMuted} strokeWidth={scaledStroke(1.5)} data-type="handleOut" data-path-id={data.id} data-anchor-index={index} className="pointer-events-all cursor-move transition-colors duration-75" />}
            {/* UPDATED: Brighter anchors */}
            <circle cx={anchor.point.x} cy={anchor.point.y} r={scaledRadius(isAnchorHovered ? HOVER_RADIUS : BASE_RADIUS)} fill={isAnchorHovered ? accent : accentMuted} stroke={isAnchorHovered ? "white" : "rgba(255, 255, 255, 0.9)"} strokeWidth={scaledStroke(1.5)} data-type="anchor" data-path-id={data.id} data-anchor-index={index} className="pointer-events-all cursor-move transition-colors duration-75" />
          </g>
        );
      })}
    </g>
  );
});

const ShapeControls: React.FC<{ path: RectangleData | EllipseData | ImageData | PolygonData, scale: number, isSelectedAlone: boolean }> = React.memo(({ path, scale, isSelectedAlone }) => {
    const bbox = getPathBoundingBox(path, true);
    if (!bbox) return null;
    const scaledStroke = (width: number) => Math.max(0.5, width / scale);
    const handleSize = 8 / scale;
    const halfHandleSize = handleSize / 2;
    const accent = '#3B82F6';
    const handles: { pos: Point, name: ResizeHandlePosition, cursor: string }[] = [];
    const { x, y, width, height } = bbox;
    handles.push({ pos: { x, y }, name: 'top-left', cursor: 'nwse-resize' }, { pos: { x: x + width, y }, name: 'top-right', cursor: 'nesw-resize' }, { pos: { x, y: y + height }, name: 'bottom-left', cursor: 'nesw-resize' }, { pos: { x: x + width, y: y + height }, name: 'bottom-right', cursor: 'nwse-resize' }, { pos: { x: x + width / 2, y }, name: 'top', cursor: 'ns-resize' }, { pos: { x: x + width, y: y + height / 2 }, name: 'right', cursor: 'ew-resize' }, { pos: { x: x + width / 2, y: y + height }, name: 'bottom', cursor: 'ns-resize' }, { pos: { x, y: y + height / 2 }, name: 'left', cursor: 'ew-resize' });
    
    return (
        <g className="pointer-events-auto">
            <rect x={bbox.x} y={bbox.y} width={bbox.width} height={bbox.height} fill="none" stroke={accent} strokeWidth={scaledStroke(1)} strokeDasharray={`${4 / scale} ${4 / scale}`} className="pointer-events-none" />
            {handles.map(({ pos, name, cursor }) => (<rect key={name} x={pos.x - halfHandleSize} y={pos.y - halfHandleSize} width={handleSize} height={handleSize} fill="white" stroke={accent} strokeWidth={scaledStroke(1)} data-handle={name} data-path-id={path.id} style={{ cursor }} className="pointer-events-all" />))}
            
            {isSelectedAlone && (path.tool === 'rectangle' || path.tool === 'image' || path.tool === 'polygon') && (() => {
                const cornerPos = { x: bbox.x, y: bbox.y };
                // Using a fixed screen-space offset makes it consistent regardless of zoom.
                const handleOffset = 20 / scale; 
                const handlePos = { x: cornerPos.x, y: cornerPos.y - handleOffset };
                
                return (
                    <>
                        <line 
                            x1={cornerPos.x} y1={cornerPos.y} 
                            x2={handlePos.x} y2={handlePos.y} 
                            stroke="orange" 
                            strokeWidth={1/scale} 
                            strokeDasharray={`${2/scale} ${2/scale}`} 
                            className="pointer-events-none" 
                        />
                        <circle 
                            cx={handlePos.x} cy={handlePos.y} 
                            r={5 / scale} 
                            fill="orange" 
                            stroke="white" 
                            strokeWidth={1 / scale} 
                            data-handle="border-radius" 
                            data-path-id={path.id} 
                            style={{ cursor: 'ew-resize' }} 
                            className="pointer-events-all" 
                        />
                    </>
                );
            })()}
        </g>
    );
});

const IndividualHighlight: React.FC<{ path: AnyPath, scale: number }> = React.memo(({ path, scale }) => {
    const bbox = getPathBoundingBox(path, true);
    if (!bbox) return null;
    const scaledStroke = (width: number) => Math.max(0.5, width / scale);
    return (<rect x={bbox.x} y={bbox.y} width={bbox.width} height={bbox.height} fill="none" stroke={'#3B82F6'} strokeOpacity="0.9" strokeWidth={scaledStroke(1)} strokeDasharray={`${3 / scale} ${3 / scale}`} className="pointer-events-none" />);
});

const MultiSelectionControls: React.FC<{ paths: AnyPath[], scale: number }> = React.memo(({ paths, scale }) => {
    const bbox = getPathsBoundingBox(paths, true);
    if (!bbox) return null;
    const accent = '#3B82F6';
    const scaledStroke = (width: number) => Math.max(0.5, width / scale);
    const handleSize = 8 / scale, halfHandleSize = handleSize / 2, rotationHandleOffset = 20 / scale;
    const handles: { pos: Point, name: ResizeHandlePosition, cursor: string }[] = [];
    const { x, y, width, height } = bbox;
    handles.push({ pos: { x, y }, name: 'top-left', cursor: 'nwse-resize' }, { pos: { x: x + width, y }, name: 'top-right', cursor: 'nesw-resize' }, { pos: { x, y: y + height }, name: 'bottom-left', cursor: 'nesw-resize' }, { pos: { x: x + width, y: y + height }, name: 'bottom-right', cursor: 'nwse-resize' }, { pos: { x: x + width / 2, y }, name: 'top', cursor: 'ns-resize' }, { pos: { x: x + width, y: y + height / 2 }, name: 'right', cursor: 'ew-resize' }, { pos: { x: x + width / 2, y: y + height }, name: 'bottom', cursor: 'ns-resize' }, { pos: { x, y: y + height / 2 }, name: 'left', cursor: 'ew-resize' });
    const topCenter = { x: x + width / 2, y: y };
    const rotationHandlePos = { x: topCenter.x, y: topCenter.y - rotationHandleOffset };

    return (
        <g className="pointer-events-auto">
            {paths.map(p => <IndividualHighlight key={p.id} path={p} scale={scale} />)}
            <rect x={bbox.x} y={bbox.y} width={bbox.width} height={bbox.height} fill="none" stroke={accent} strokeWidth={scaledStroke(1)} strokeDasharray={`${4 / scale} ${4 / scale}`} className="pointer-events-none" />
            <line x1={topCenter.x} y1={topCenter.y} x2={rotationHandlePos.x} y2={rotationHandlePos.y} stroke={accent} strokeWidth={scaledStroke(1)} strokeDasharray={`${2 / scale} ${2 / scale}`} className="pointer-events-none" />
            <circle cx={rotationHandlePos.x} cy={rotationHandlePos.y} r={5 / scale} fill="white" stroke={accent} strokeWidth={scaledStroke(1)} data-handle="rotate" style={{ cursor: 'grab' }} className="pointer-events-all" />
            {handles.map(({ pos, name, cursor }) => (<rect key={name} x={pos.x - halfHandleSize} y={pos.y - halfHandleSize} width={handleSize} height={handleSize} fill="white" stroke={accent} strokeWidth={scaledStroke(1)} data-handle={name} style={{ cursor }} className="pointer-events-all" />))}
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

  // Edit mode logic
  if (selectionMode === 'edit') {
    if (selectedPaths.length === 1) {
      const selectedPath = selectedPaths[0];
      if (selectedPath.tool === 'pen' || selectedPath.tool === 'line') {
        return <VectorPathControls data={selectedPath as VectorPathData} scale={scale} dragState={dragState} hoveredPoint={hoveredPoint} />;
      }
      if (selectedPath.tool === 'rectangle' || selectedPath.tool === 'ellipse' || selectedPath.tool === 'image' || selectedPath.tool === 'polygon') {
        return <ShapeControls path={selectedPath as RectangleData | EllipseData | ImageData | PolygonData} scale={scale} isSelectedAlone={true} />;
      }
    }
    // For multi-select in 'edit' mode, just show a highlight.
    return (
      <g>
        {selectedPaths.map(p => <IndividualHighlight key={p.id} path={p} scale={scale} />)}
      </g>
    );
  }

  // Move/transform mode logic
  if (selectionMode === 'move') {
    if (selectedPaths.length === 1) {
        const selectedPath = selectedPaths[0];
        if (selectedPath.tool === 'rectangle' || selectedPath.tool === 'ellipse' || selectedPath.tool === 'image' || selectedPath.tool === 'polygon') {
            return <ShapeControls path={selectedPath as RectangleData | EllipseData | ImageData | PolygonData} scale={scale} isSelectedAlone={true} />;
        }
    }
    return <MultiSelectionControls paths={selectedPaths} scale={scale} />;
  }
  
  return null;
});
