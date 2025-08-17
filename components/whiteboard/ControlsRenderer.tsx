
import React from 'react';
import type { AnyPath, VectorPathData, RectangleData, EllipseData, Point, DragState, Tool, SelectionMode, ResizeHandlePosition, ImageData } from '../../types';
import { getPathBoundingBox, getPathsBoundingBox, dist } from '../../lib/geometry';


const VectorPathControls: React.FC<{ data: VectorPathData; scale: number; dragState: DragState | null; hoveredPoint: Point | null; }> = React.memo(({ data, scale, dragState, hoveredPoint }) => {
  const scaledStroke = (width: number) => Math.max(0.5, width / scale);
  const scaledRadius = (r: number) => Math.max(2, r / scale);

  const BASE_RADIUS = 5, HOVER_RADIUS = 8, HIT_RADIUS = 10, EXPLOSION_OFFSET = 12;

  const hoverRadius = HIT_RADIUS / scale, explosionOffset = EXPLOSION_OFFSET / scale;

  return (
    <g className="pointer-events-auto">
      {dragState && 'anchorIndex' in dragState && dragState.pathId === data.id && dragState.anchorIndex < data.anchors.length && (
        <>
          {dragState.type === 'anchor' && (<circle cx={data.anchors[dragState.anchorIndex].point.x} cy={data.anchors[dragState.anchorIndex].point.y} r={scaledRadius(10)} fill="var(--accent-secondary)" className="pointer-events-none" />)}
          {(dragState.type === 'handleIn' || dragState.type === 'handleOut') && (<circle cx={dragState.type === 'handleIn' ? data.anchors[dragState.anchorIndex].handleIn.x : data.anchors[dragState.anchorIndex].handleOut.x} cy={dragState.type === 'handleIn' ? data.anchors[dragState.anchorIndex].handleIn.y : data.anchors[dragState.anchorIndex].handleOut.y} r={scaledRadius(10)} fill="rgba(168, 85, 247, 0.3)" className="pointer-events-none" />)}
        </>
      )}
      {data.anchors.map((anchor, index) => {
        const isDraggingThis = dragState && 'anchorIndex' in dragState && dragState.pathId === data.id && dragState.anchorIndex === index;
        const canHover = !dragState || isDraggingThis;
        const isHandleInCollapsed = dist(anchor.point, anchor.handleIn) < 1;
        const isHandleOutCollapsed = dist(anchor.point, anchor.handleOut) < 1;
        let displayHandleIn = anchor.handleIn, displayHandleOut = anchor.handleOut, shouldExplode = false;

        if (isHandleInCollapsed || isHandleOutCollapsed) {
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
        const isDisplayHandleInHovered = canHover && hoveredPoint && dist(displayHandleIn, hoveredPoint) < hoverRadius;
        const isDisplayHandleOutHovered = canHover && hoveredPoint && dist(displayHandleOut, hoveredPoint) < hoverRadius;
        const isAnythingHoveredOnGroup = shouldExplode || isAnchorHovered || isDisplayHandleInHovered || isDisplayHandleOutHovered;
        const areHandlesVisible = (displayHandleIn.x !== anchor.point.x || displayHandleIn.y !== anchor.point.y || displayHandleOut.x !== anchor.point.x || displayHandleOut.y !== anchor.point.y);
        const accent = 'var(--accent-primary)';

        return (
          <g key={index}>
            {areHandlesVisible && (
              <>
                <line x1={displayHandleIn.x} y1={displayHandleIn.y} x2={anchor.point.x} y2={anchor.point.y} stroke={isAnythingHoveredOnGroup ? accent : "rgba(22, 163, 175, 0.4)"} strokeWidth={scaledStroke(1)} className="pointer-events-none transition-colors duration-75" />
                <line x1={displayHandleOut.x} y1={displayHandleOut.y} x2={anchor.point.x} y2={anchor.point.y} stroke={isAnythingHoveredOnGroup ? accent : "rgba(22, 163, 175, 0.4)"} strokeWidth={scaledStroke(1)} className="pointer-events-none transition-colors duration-75" />
              </>
            )}
            <circle cx={displayHandleIn.x} cy={displayHandleIn.y} r={scaledRadius(isDisplayHandleInHovered ? HOVER_RADIUS : BASE_RADIUS)} fill={isDisplayHandleInHovered ? "white" : "rgba(255, 255, 255, 0.8)"} stroke={isDisplayHandleInHovered ? accent : "rgba(22, 163, 175, 0.6)"} strokeWidth={scaledStroke(1)} data-type="handleIn" data-path-id={data.id} data-anchor-index={index} className="pointer-events-all cursor-move transition-colors duration-75" />
            <circle cx={displayHandleOut.x} cy={displayHandleOut.y} r={scaledRadius(isDisplayHandleOutHovered ? HOVER_RADIUS : BASE_RADIUS)} fill={isDisplayHandleOutHovered ? "white" : "rgba(255, 255, 255, 0.8)"} stroke={isDisplayHandleOutHovered ? accent : "rgba(22, 163, 175, 0.6)"} strokeWidth={scaledStroke(1)} data-type="handleOut" data-path-id={data.id} data-anchor-index={index} className="pointer-events-all cursor-move transition-colors duration-75" />
            <circle cx={anchor.point.x} cy={anchor.point.y} r={scaledRadius(isAnchorHovered ? HOVER_RADIUS : BASE_RADIUS)} fill={isAnchorHovered ? accent : "rgba(22, 163, 175, 0.4)"} stroke={isAnchorHovered ? "white" : "rgba(255, 255, 255, 0.8)"} strokeWidth={scaledStroke(1.5)} data-type="anchor" data-path-id={data.id} data-anchor-index={index} className="pointer-events-all cursor-move transition-colors duration-75" />
          </g>
        );
      })}
    </g>
  );
});

const ShapeControls: React.FC<{ path: RectangleData | EllipseData | ImageData, scale: number, isSelectedAlone: boolean }> = React.memo(({ path, scale, isSelectedAlone }) => {
    const bbox = getPathBoundingBox(path, false);
    const scaledStroke = (width: number) => Math.max(0.5, width / scale);
    const handleSize = 8 / scale;
    const halfHandleSize = handleSize / 2;
    const accent = 'var(--accent-primary)';
    const handles: { pos: Point, name: ResizeHandlePosition, cursor: string }[] = [];
    const { x, y, width, height } = bbox;
    handles.push({ pos: { x, y }, name: 'top-left', cursor: 'nwse-resize' }, { pos: { x: x + width, y }, name: 'top-right', cursor: 'nesw-resize' }, { pos: { x, y: y + height }, name: 'bottom-left', cursor: 'nesw-resize' }, { pos: { x: x + width, y: y + height }, name: 'bottom-right', cursor: 'nwse-resize' }, { pos: { x: x + width / 2, y }, name: 'top', cursor: 'ns-resize' }, { pos: { x: x + width, y: y + height / 2 }, name: 'right', cursor: 'ew-resize' }, { pos: { x: x + width / 2, y: y + height }, name: 'bottom', cursor: 'ns-resize' }, { pos: { x, y: y + height / 2 }, name: 'left', cursor: 'ew-resize' });
    
    return (
        <g className="pointer-events-auto">
            <rect x={bbox.x} y={bbox.y} width={bbox.width} height={bbox.height} fill="none" stroke={accent} strokeWidth={scaledStroke(1)} strokeDasharray={`${4 / scale} ${4 / scale}`} className="pointer-events-none" />
            {handles.map(({ pos, name, cursor }) => (<rect key={name} x={pos.x - halfHandleSize} y={pos.y - halfHandleSize} width={handleSize} height={handleSize} fill="white" stroke={accent} strokeWidth={scaledStroke(1)} data-handle={name} data-path-id={path.id} style={{ cursor }} className="pointer-events-all" />))}
            
            {isSelectedAlone && (path.tool === 'rectangle' || path.tool === 'image') && (() => {
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
    const bbox = getPathBoundingBox(path, false);
    if (!bbox) return null;
    const scaledStroke = (width: number) => Math.max(0.5, width / scale);
    return (<rect x={bbox.x} y={bbox.y} width={bbox.width} height={bbox.height} fill="none" stroke={'var(--accent-primary)'} strokeOpacity="0.9" strokeWidth={scaledStroke(1)} strokeDasharray={`${3 / scale} ${3 / scale}`} className="pointer-events-none" />);
});

const MultiSelectionControls: React.FC<{ paths: AnyPath[], scale: number }> = React.memo(({ paths, scale }) => {
    const bbox = getPathsBoundingBox(paths);
    if (!bbox) return null;
    const accent = 'var(--accent-primary)';
    const scaledStroke = (width: number) => Math.max(0.5, width / scale);
    const handleSize = 8 / scale, halfHandleSize = handleSize / 2, rotationHandleOffset = 20 / scale;
    const handles: { pos: Point, name: ResizeHandlePosition, cursor: string }[] = [];
    const { x, y, width, height } = bbox;
    handles.push({ pos: { x, y }, name: 'top-left', cursor: 'nwse-resize' }, { pos: { x: x + width, y }, name: 'top-right', cursor: 'nesw-resize' }, { pos: { x, y: y + height }, name: 'bottom-left', cursor: 'nesw-resize' }, { pos: { x: x + width, y: y + height }, name: 'bottom-right', cursor: 'nwse-resize' }, { pos: { x: x + width / 2, y }, name: 'top', cursor: 'ns-resize' }, { pos: { x: x + width, y: y + height / 2 }, name: 'right', cursor: 'ew-resize' }, { pos: { x: x + width / 2, y: y + height }, name: 'bottom', cursor: 'ns-resize' }, { pos: { x, y: y + height / 2 }, name: 'left', cursor: 'ew-resize' });
    const topCenter = { x: x + width / 2, y: y };
    const rotationHandlePos = { x: topCenter.x, y: topCenter.y - rotationHandleOffset };

    return (
        <g className="pointer-events-auto" data-type="selection-controls">
            <rect x={bbox.x} y={bbox.y} width={bbox.width} height={bbox.height} fill="none" stroke={accent} strokeWidth={scaledStroke(1)} className="pointer-events-none" />
            <line x1={topCenter.x} y1={topCenter.y} x2={rotationHandlePos.x} y2={rotationHandlePos.y} stroke={accent} strokeWidth={scaledStroke(1)} className="pointer-events-none" />
            <circle cx={rotationHandlePos.x} cy={rotationHandlePos.y} r={handleSize / 1.5} fill="white" stroke={accent} strokeWidth={scaledStroke(1)} data-handle="rotate" style={{ cursor: 'alias' }} className="pointer-events-all" />
            {handles.map(({ pos, name, cursor }) => (<rect key={name} x={pos.x - halfHandleSize} y={pos.y - halfHandleSize} width={handleSize} height={handleSize} fill="white" stroke={accent} strokeWidth={scaledStroke(1)} data-handle={name} style={{ cursor }} className="pointer-events-all" />))}
            
            {paths.length === 1 && (paths[0].tool === 'rectangle' || paths[0].tool === 'image') && (() => {
                const path = paths[0];
                const cornerPos = { x: bbox.x, y: bbox.y };
                const handleOffset = 20 / scale; // Match rotation handle
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
  hoveredPoint
}) => {
  const isSingleSelection = selectedPaths.length === 1;

  return (
    <>
      {/* Render controls for selected paths */}
      {tool === 'selection' && selectionMode === 'edit' && selectedPaths.length > 0 &&
        selectedPaths.map(path => (
          <React.Fragment key={`controls-${path.id}`}>
            {(path.tool === 'pen' || path.tool === 'line') && (
              <VectorPathControls data={path as VectorPathData} scale={scale} dragState={dragState} hoveredPoint={hoveredPoint} />
            )}
            {(path.tool === 'rectangle' || path.tool === 'ellipse' || path.tool === 'image') && (
              <ShapeControls path={path as RectangleData | EllipseData | ImageData} scale={scale} isSelectedAlone={isSingleSelection} />
            )}
          </React.Fragment>
        ))
      }

      {tool === 'selection' && selectionMode === 'move' && selectedPaths.length > 0 && (
        <>
          {selectedPaths.length > 1 &&
            selectedPaths.map(p => (
              <IndividualHighlight key={`highlight-${p.id}`} path={p} scale={scale} />
            ))}
          <MultiSelectionControls paths={selectedPaths} scale={scale} />
        </>
      )}

      {/* Render controls for current pen/line path */}
      {currentPenPath && (
        <VectorPathControls data={currentPenPath} scale={scale} dragState={dragState} hoveredPoint={hoveredPoint} />
      )}
      {currentLinePath && (
        <VectorPathControls data={currentLinePath} scale={scale} dragState={dragState} hoveredPoint={hoveredPoint} />
      )}
    </>
  );
});