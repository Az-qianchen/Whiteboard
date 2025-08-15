
import React, { useRef, useEffect, useState } from 'react';
import rough from 'roughjs/bin/rough';
import type { RoughSVG } from 'roughjs/bin/svg';
import type { AnyPath, VectorPathData, BrushPathData, LivePath, Point, DrawingShape, RectangleData, EllipseData, ResizeHandlePosition } from '../types';
import { pointsToPathD, anchorsToPathD } from '../lib/path-fitting';
import { getMarqueeRect, getPathBoundingBox } from '../lib/geometry';

interface WhiteboardProps {
  paths: AnyPath[];
  currentLivePath: LivePath | null;
  drawingShape: DrawingShape | null;
  currentPenPath: VectorPathData | null;
  currentLinePath: VectorPathData | null;
  previewD: string | null;
  selectedPathIds: string[];
  marquee: { start: Point; end: Point } | null;
  onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerLeave: (e: React.PointerEvent<SVGSVGElement>) => void;
  onWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  viewTransform: { scale: number, translateX: number, translateY: number };
  cursor: string;
  isGridVisible: boolean;
  gridSize: number;
}

// 对于画笔工具的实时预览，我们使用一个简单、高性能的路径。
const LivePathPreview: React.FC<{ data: LivePath }> = React.memo(({ data }) => {
  const d = pointsToPathD(data.points);
  return (
    <path
      d={d}
      stroke={data.color}
      strokeWidth={data.strokeWidth}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none"
    />
  );
});

// 对于已完成的路径，我们使用 RoughJS 以手绘风格渲染它们。
const RoughPath: React.FC<{ rc: RoughSVG | null; data: AnyPath }> = React.memo(({ rc, data }) => {
  const gRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!rc || !gRef.current) return;

    const g = gRef.current;
    
    // 清除先前渲染的路径，以防止数据更改时出现重复
    while (g.firstChild) {
      g.removeChild(g.firstChild);
    }

    // 使用路径ID作为种子以获得一致的随机性
    const seed = parseInt(data.id, 10);
    
    const options: any = {
      stroke: data.color,
      strokeWidth: data.strokeWidth,
      roughness: data.roughness,
      bowing: data.bowing,
      curveTightness: data.curveTightness,
      curveStepCount: data.curveStepCount,
      seed: isNaN(seed) ? 1 : seed,
    };

    if (data.fill && data.fill !== 'transparent') {
        options.fill = data.fill;
        options.fillStyle = data.fillStyle || 'hachure';
        // 仅当它们不是哨兵默认值时才添加这些
        if (data.fillWeight > 0) {
            options.fillWeight = data.fillWeight;
        }
        if (data.hachureGap > 0) {
            options.hachureGap = data.hachureGap;
        }
        options.hachureAngle = data.hachureAngle;
    }
    
    let node;
    
    switch (data.tool) {
        case 'rectangle': {
          const { x, y, width, height } = data as RectangleData;
          node = rc.rectangle(x, y, width, height, options);
          break;
        }
        case 'ellipse': {
            const { x, y, width, height } = data as EllipseData;
            const cx = x + width / 2;
            const cy = y + height / 2;
            node = rc.ellipse(cx, cy, width, height, options);
            break;
        }
        case 'pen':
        case 'brush':
        case 'line': {
            const pathData = data as VectorPathData | BrushPathData;
            if (!pathData.anchors || pathData.anchors.length === 0) return;

            // 对于单点路径，绘制一个点
            if (pathData.anchors.length === 1) {
                const dotOptions = { ...options, fill: pathData.color, fillStyle: 'solid' };
                node = rc.circle(pathData.anchors[0].point.x, pathData.anchors[0].point.y, data.strokeWidth, dotOptions);
            } else {
                if (pathData.tool === 'pen' || pathData.tool === 'brush') {
                    // 对于钢笔和画笔，生成贝塞尔路径字符串并使用 rc.path
                    const pathD = anchorsToPathD(pathData.anchors, !!pathData.isClosed);
                    // rc.path 不使用与曲线相关的属性，如 curveTightness，
                    // 但为了与其他工具保持一致，我们传递所有选项。RoughJS 会忽略它不需要的。
                    node = rc.path(pathD, options);
                } else { // 'line' 工具
                    // 线条工具只是一组点，因此 rc.curve 是合适的
                    const points = pathData.anchors.map(a => [a.point.x, a.point.y] as [number, number]);
                    
                    // 对于闭合路径，重复第一个点以闭合曲线
                    if (pathData.isClosed && points.length > 0) {
                        points.push(points[0]);
                    }
                    
                    // 使用 rc.curve，它能绘制连续的线条并正确应用 'curveTightness'
                    node = rc.curve(points, options);
                }
            }
            break;
        }
    }
    
    if (node) {
      g.appendChild(node);
    }

  }, [rc, data]);

  // 使用 pointer-events-none 以便根 SVG 可以处理命中检测以进行选择。
  // 交互式控件（锚点、调整大小手柄）将具有 pointer-events-auto/all 以便可以点击。
  return <g ref={gRef} className="pointer-events-none" />;
});


const VectorPathControls: React.FC<{ data: VectorPathData; scale: number }> = React.memo(({ data, scale }) => {
  const scaledStroke = (width: number) => Math.max(0.5, width / scale);
  const scaledRadius = (r: number) => Math.max(2, r / scale);

  return (
    <g className="pointer-events-auto">
      {/* 锚点和控制柄 */}
      {data.anchors.map((anchor, index) => (
        <g key={index}>
          {/* 控制柄（仅当它们与与点不同时才显示） */}
          { (anchor.handleIn.x !== anchor.point.x || anchor.handleIn.y !== anchor.point.y ||
             anchor.handleOut.x !== anchor.point.x || anchor.handleOut.y !== anchor.point.y) &&
            <>
              <line x1={anchor.handleIn.x} y1={anchor.handleIn.y} x2={anchor.point.x} y2={anchor.point.y} stroke="cyan" strokeWidth={scaledStroke(1)} className="pointer-events-none" />
              <line x1={anchor.handleOut.x} y1={anchor.handleOut.y} x2={anchor.point.x} y2={anchor.point.y} stroke="cyan" strokeWidth={scaledStroke(1)} className="pointer-events-none" />
              <circle cx={anchor.handleIn.x} cy={anchor.handleIn.y} r={scaledRadius(4)} fill="white" stroke="cyan" strokeWidth={scaledStroke(1)} data-type="handleIn" data-path-id={data.id} data-anchor-index={index} className="pointer-events-all cursor-move" />
              <circle cx={anchor.handleOut.x} cy={anchor.handleOut.y} r={scaledRadius(4)} fill="white" stroke="cyan" strokeWidth={scaledStroke(1)} data-type="handleOut" data-path-id={data.id} data-anchor-index={index} className="pointer-events-all cursor-move" />
            </>
          }
          {/* 锚点 */}
          <circle cx={anchor.point.x} cy={anchor.point.y} r={scaledRadius(5)} fill="cyan" stroke="white" strokeWidth={scaledStroke(1.5)} data-type="anchor" data-path-id={data.id} data-anchor-index={index} className="pointer-events-all cursor-move"/>
        </g>
      ))}
    </g>
  );
});

const ShapeControls: React.FC<{ path: RectangleData | EllipseData | BrushPathData, scale: number }> = React.memo(({ path, scale }) => {
    const bbox = getPathBoundingBox(path, false);
    const scaledStroke = (width: number) => Math.max(0.5, width / scale);
    const handleSize = 8 / scale;
    const halfHandleSize = handleSize / 2;

    const handles: { pos: Point, name: ResizeHandlePosition, cursor: string }[] = [];
    const { x, y, width, height } = bbox;
    handles.push({ pos: { x, y }, name: 'top-left', cursor: 'nwse-resize' });
    handles.push({ pos: { x: x + width, y }, name: 'top-right', cursor: 'nesw-resize' });
    handles.push({ pos: { x, y: y + height }, name: 'bottom-left', cursor: 'nesw-resize' });
    handles.push({ pos: { x: x + width, y: y + height }, name: 'bottom-right', cursor: 'nwse-resize' });
    if (path.tool !== 'brush') {
      handles.push({ pos: { x: x + width / 2, y }, name: 'top', cursor: 'ns-resize' });
      handles.push({ pos: { x: x + width, y: y + height / 2 }, name: 'right', cursor: 'ew-resize' });
      handles.push({ pos: { x: x + width / 2, y: y + height }, name: 'bottom', cursor: 'ns-resize' });
      handles.push({ pos: { x, y: y + height / 2 }, name: 'left', cursor: 'ew-resize' });
    }
    
    return (
        <g className="pointer-events-auto">
            <rect
                x={bbox.x}
                y={bbox.y}
                width={bbox.width}
                height={bbox.height}
                fill="none"
                stroke="cyan"
                strokeWidth={scaledStroke(1)}
                strokeDasharray={`${4 / scale} ${4 / scale}`}
                className="pointer-events-none"
            />
            {handles.map(({ pos, name, cursor }) => (
                <rect
                    key={name}
                    x={pos.x - halfHandleSize}
                    y={pos.y - halfHandleSize}
                    width={handleSize}
                    height={handleSize}
                    fill="white"
                    stroke="cyan"
                    strokeWidth={scaledStroke(1)}
                    data-handle={name}
                    style={{ cursor }}
                    className="pointer-events-all"
                />
            ))}
        </g>
    );
});

export const Whiteboard: React.FC<WhiteboardProps> = ({
  paths,
  currentLivePath,
  drawingShape,
  currentPenPath,
  currentLinePath,
  previewD,
  selectedPathIds,
  marquee,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
  onWheel,
  viewTransform,
  cursor,
  isGridVisible,
  gridSize,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rc, setRc] = useState<RoughSVG | null>(null);

  useEffect(() => {
    if (svgRef.current) {
      setRc(rough.svg(svgRef.current));
    }
  }, []);

  const selectedPaths = paths.filter(p => selectedPathIds.includes(p.id));
  const singleSelectedPath = selectedPaths.length === 1 ? selectedPaths[0] : null;

  return (
    <div
      className="w-full h-full bg-white dark:bg-[#343b47] rounded-lg shadow-inner overflow-hidden touch-none"
      onWheel={onWheel}
      style={{ cursor }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
      >
        {isGridVisible && (
          <>
            <defs>
              <pattern
                id="grid"
                width={gridSize * viewTransform.scale}
                height={gridSize * viewTransform.scale}
                patternUnits="userSpaceOnUse"
                x={viewTransform.translateX}
                y={viewTransform.translateY}
              >
                <path
                  d={`M ${gridSize * viewTransform.scale} 0 L 0 0 0 ${gridSize * viewTransform.scale}`}
                  fill="none"
                  className="stroke-slate-200 dark:stroke-slate-600"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect
              className="pointer-events-none"
              width="100%"
              height="100%"
              fill="url(#grid)"
            />
          </>
        )}
        <g style={{ transform: `translate(${viewTransform.translateX}px, ${viewTransform.translateY}px) scale(${viewTransform.scale})` }}>
          {/* Render completed paths */}
          {paths.map((path) => (
            <RoughPath 
              key={path.id} 
              rc={rc} 
              data={path} 
            />
          ))}

          {/* Render live brush path */}
          {currentLivePath && <LivePathPreview data={currentLivePath} />}
          
          {/* Render live shape drawing */}
          {drawingShape && (
            <g>
              {drawingShape.tool === 'rectangle' && (
                  <rect
                      x={drawingShape.x}
                      y={drawingShape.y}
                      width={drawingShape.width}
                      height={drawingShape.height}
                      fill={drawingShape.fill === 'transparent' ? 'none' : drawingShape.fill}
                      stroke={drawingShape.color}
                      strokeWidth={1 / viewTransform.scale}
                      strokeDasharray={`4 ${4 / viewTransform.scale}`}
                      className="pointer-events-none"
                  />
              )}
              {drawingShape.tool === 'ellipse' && (
                  <ellipse
                      cx={drawingShape.x + drawingShape.width / 2}
                      cy={drawingShape.y + drawingShape.height / 2}
                      rx={Math.abs(drawingShape.width / 2)}
                      ry={Math.abs(drawingShape.height / 2)}
                      fill={drawingShape.fill === 'transparent' ? 'none' : drawingShape.fill}
                      stroke={drawingShape.color}
                      strokeWidth={1 / viewTransform.scale}
                      strokeDasharray={`4 ${4 / viewTransform.scale}`}
                      className="pointer-events-none"
                  />
              )}
              {drawingShape.tool === 'line' && drawingShape.anchors.length > 1 && (
                 <path d={anchorsToPathD(drawingShape.anchors)} fill="none" stroke={drawingShape.color} strokeWidth={1 / viewTransform.scale} strokeDasharray={`4 ${4 / viewTransform.scale}`} className="pointer-events-none" />
              )}
            </g>
          )}

          {/* Render pen preview path */}
          {previewD && (
            <path
              d={previewD}
              fill="none"
              stroke="cyan"
              strokeWidth={1 / viewTransform.scale}
              strokeDasharray={`4 ${4 / viewTransform.scale}`}
              className="pointer-events-none"
            />
          )}

          {/* Render current pen path, treated as "selected" for correct curve preview */}
          {currentPenPath && (
            <RoughPath 
              rc={rc} 
              data={currentPenPath} 
            />
          )}
          {currentLinePath && (
             <RoughPath rc={rc} data={currentLinePath} />
          )}

          {/* Render controls for selected paths */}
          {singleSelectedPath && (singleSelectedPath.tool === 'pen' || singleSelectedPath.tool === 'line') && 
            <VectorPathControls key={singleSelectedPath.id} data={singleSelectedPath as VectorPathData} scale={viewTransform.scale} />
          }
          {singleSelectedPath && (singleSelectedPath.tool === 'rectangle' || singleSelectedPath.tool === 'ellipse' || singleSelectedPath.tool === 'brush') &&
            <ShapeControls key={singleSelectedPath.id} path={singleSelectedPath as RectangleData | EllipseData | BrushPathData} scale={viewTransform.scale} />
          }

          {/* Render controls for current pen path */}
          {currentPenPath && (
            <VectorPathControls data={currentPenPath} scale={viewTransform.scale} />
          )}
          {currentLinePath && (
            <VectorPathControls data={currentLinePath} scale={viewTransform.scale} />
          )}
          
          {/* Render marquee selection box */}
          {marquee && (
            <rect
              {...getMarqueeRect(marquee)}
              fill="rgba(0, 100, 255, 0.1)"
              stroke="rgba(0, 100, 255, 0.5)"
              strokeWidth={1 / viewTransform.scale}
              strokeDasharray={`4 ${4 / viewTransform.scale}`}
              className="pointer-events-none"
            />
          )}
        </g>
      </svg>
    </div>
  );
};
