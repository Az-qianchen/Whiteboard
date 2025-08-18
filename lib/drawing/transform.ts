import paper from 'paper';
import type { AnyPath, Point, RectangleData, EllipseData, ResizeHandlePosition, VectorPathData, ImageData, Anchor, BrushPathData, PolygonData, ArcData, GroupData } from '../../types';
import { rotatePoint } from './geom';
import { getPolygonVertices } from './polygon';

export function resizePath(
    originalPath: RectangleData | EllipseData | ImageData | PolygonData,
    handle: ResizeHandlePosition,
    currentPos: Point,
    initialPos: Point,
    keepAspectRatio: boolean
): AnyPath {
    const dx = currentPos.x - initialPos.x;
    const dy = currentPos.y - initialPos.y;

    let { x, y, width, height } = originalPath;
    const originalAspectRatio = width / height;

    const handleLeft = handle.includes('left');
    const handleRight = handle.includes('right');
    const handleTop = handle.includes('top');
    const handleBottom = handle.includes('bottom');
    
    if (handleRight) width += dx;
    if (handleBottom) height += dy;
    if (handleLeft) {
      width -= dx;
      x += dx;
    }
    if (handleTop) {
      height -= dy;
      y += dy;
    }

    if (keepAspectRatio) {
        if (handle.includes('left') || handle.includes('right')) {
            const newHeight = width / originalAspectRatio;
            if (handleTop) {
              y += height - newHeight;
            }
            height = newHeight;
        } else { // top, bottom, or corners
             const newWidth = height * originalAspectRatio;
             if (handleLeft) {
               x += width - newWidth;
             }
             width = newWidth;
        }
    }
    
    if (width < 0) {
      x += width;
      width = -width;
    }
    if (height < 0) {
      y += height;
      height = -height;
    }

    return { ...originalPath, x, y, width, height };
}

export function movePath<T extends AnyPath>(path: T, dx: number, dy: number): T {
    switch(path.tool) {
        case 'brush':
            return {
                ...path,
                points: (path as BrushPathData).points.map(p => ({
                    x: p.x + dx,
                    y: p.y + dy,
                }))
            };
        case 'arc':
            return {
                ...path,
                points: (path as ArcData).points.map(p => ({
                    x: p.x + dx,
                    y: p.y + dy,
                })) as [Point, Point, Point]
            };
        case 'pen':
        case 'line':
            return {
                ...path,
                anchors: (path as VectorPathData).anchors.map(a => ({
                    point: { x: a.point.x + dx, y: a.point.y + dy },
                    handleIn: { x: a.handleIn.x + dx, y: a.handleIn.y + dy },
                    handleOut: { x: a.handleOut.x + dx, y: a.handleOut.y + dy },
                }))
            };
        case 'rectangle':
        case 'ellipse':
        case 'image':
        case 'polygon':
            return { ...path, x: path.x + dx, y: path.y + dy };
        case 'group': {
            const groupPath = path as GroupData;
            const newChildren = groupPath.children.map(child => movePath(child, dx, dy));
            return { ...path, children: newChildren };
        }
    }
}

export function rotatePath<T extends AnyPath>(path: T, center: Point, angle: number): T {
    switch (path.tool) {
        case 'brush': {
            const brushPath = path as BrushPathData;
            const newPoints = brushPath.points.map(p => rotatePoint(p, center, angle));
            return { ...path, points: newPoints };
        }
        case 'arc': {
            const arcPath = path as ArcData;
            const newPoints = arcPath.points.map(p => rotatePoint(p, center, angle));
            return { ...path, points: newPoints as [Point, Point, Point] };
        }
        case 'pen':
        case 'line': {
            const vectorPath = path as VectorPathData;
            const newAnchors = vectorPath.anchors.map(anchor => ({
                point: rotatePoint(anchor.point, center, angle),
                handleIn: rotatePoint(anchor.handleIn, center, angle),
                handleOut: rotatePoint(anchor.handleOut, center, angle),
            }));
            return { ...path, anchors: newAnchors };
        }
        case 'rectangle':
        case 'ellipse':
        case 'image':
        case 'polygon': {
            const shape = path as RectangleData | EllipseData | ImageData | PolygonData;
            const originalShapeCenter = { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
            const newShapeCenter = rotatePoint(originalShapeCenter, center, angle);
            const newX = newShapeCenter.x - shape.width / 2;
            const newY = newShapeCenter.y - shape.height / 2;
            const newRotation = (shape.rotation ?? 0) + angle;
            return {
                ...path,
                x: newX,
                y: newY,
                rotation: newRotation
            };
        }
        case 'group': {
            const groupPath = path as GroupData;
            const newChildren = groupPath.children.map(child => rotatePath(child, center, angle));
            return { ...path, children: newChildren };
        }
    }
}

export function flipPath<T extends AnyPath>(path: T, center: Point, axis: 'horizontal' | 'vertical'): T {
    const flipPoint = (p: Point): Point => {
        if (axis === 'horizontal') {
            return { x: 2 * center.x - p.x, y: p.y };
        } else { // vertical
            return { x: p.x, y: 2 * center.y - p.y };
        }
    };

    switch (path.tool) {
        case 'brush': {
            const brushPath = path as BrushPathData;
            const newPoints = brushPath.points.map(flipPoint);
            return { ...path, points: newPoints };
        }
        case 'arc': {
            const arcPath = path as ArcData;
            let newPoints = arcPath.points.map(flipPoint) as [Point, Point, Point];
            // Horizontal flip reverses handedness, so swap start/end points to preserve visual direction
            if (axis === 'horizontal') {
                [newPoints[0], newPoints[1]] = [newPoints[1], newPoints[0]];
            }
            return { ...path, points: newPoints };
        }
        case 'pen':
        case 'line': {
            const vectorPath = path as VectorPathData;
            const newAnchors = vectorPath.anchors.map(anchor => {
                const newPoint = flipPoint(anchor.point);
                const newHandleIn = flipPoint(anchor.handleOut);
                const newHandleOut = flipPoint(anchor.handleIn);
                return { point: newPoint, handleIn: newHandleIn, handleOut: newHandleOut };
            });
            if (!vectorPath.isClosed) {
                newAnchors.reverse();
            }
            return { ...path, anchors: newAnchors };
        }
        case 'rectangle':
        case 'ellipse':
        case 'image':
        case 'polygon': {
            const shapePath = path as RectangleData | EllipseData | ImageData | PolygonData;
            let vectorPath: VectorPathData;
            if (path.tool === 'rectangle') {
                vectorPath = rectangleToVectorPath(path as RectangleData);
            } else if (path.tool === 'ellipse') {
                vectorPath = ellipseToVectorPath(path as EllipseData);
            } else if (path.tool === 'polygon') {
                vectorPath = polygonToVectorPath(path as PolygonData);
            } else {
                 const rectData: RectangleData = { ...path, tool: 'rectangle' };
                 vectorPath = rectangleToVectorPath(rectData);
            }
            
            const flippedAnchors = vectorPath.anchors.map(anchor => {
                const newPoint = flipPoint(anchor.point);
                const newHandleIn = flipPoint(anchor.handleOut);
                const newHandleOut = flipPoint(anchor.handleIn);
                return { point: newPoint, handleIn: newHandleIn, handleOut: newHandleOut };
            });
            
            return {
                ...path,
                id: `${path.id}-flipped`,
                tool: 'pen',
                anchors: flippedAnchors,
                isClosed: true
            } as any;
        }
        case 'group': {
            const groupPath = path as GroupData;
            const newChildren = groupPath.children.map(child => flipPath(child, center, axis));
            return { ...path, children: newChildren };
        }
    }
}

export function scalePath<T extends AnyPath>(path: T, pivot: Point, scaleX: number, scaleY: number): T {
  const scalePoint = (pt: Point) => ({ x: pivot.x + (pt.x - pivot.x) * scaleX, y: pivot.y + (pt.y - pivot.y) * scaleY });

  switch(path.tool) {
    case 'brush':
      return { ...path, points: (path as BrushPathData).points.map(scalePoint) };
    case 'arc':
      return { ...path, points: (path as ArcData).points.map(scalePoint) as [Point, Point, Point] };
    case 'pen':
    case 'line':
      return { ...path, anchors: (path as VectorPathData).anchors.map(a => ({ point: scalePoint(a.point), handleIn: scalePoint(a.handleIn), handleOut: scalePoint(a.handleOut) })) };
    case 'rectangle':
    case 'ellipse':
    case 'image':
    case 'polygon':
        const scaledX = pivot.x + (path.x - pivot.x) * scaleX;
        const scaledY = pivot.y + (path.y - pivot.y) * scaleY;
        const scaledWidth = path.width * scaleX;
        const scaledHeight = path.height * scaleY;
        const newX = scaledWidth < 0 ? scaledX + scaledWidth : scaledX;
        const newY = scaledHeight < 0 ? scaledY + scaledHeight : scaledY;
      return { ...path, x: newX, y: newY, width: Math.abs(scaledWidth), height: Math.abs(scaledHeight) };
    case 'group':
        return { ...path, children: (path as GroupData).children.map(child => scalePath(child, pivot, scaleX, scaleY)) };
  }
}

export function arcToVectorPath(path: ArcData): VectorPathData {
    const { id, points, ...baseProps } = path;
    const [start, end, via] = points;

    const project = new paper.Project(document.createElement('canvas'));
    
    // paper.Path.Arc constructor is (from, through, to)
    const paperArc = new paper.Path.Arc(
        new paper.Point(start.x, start.y),
        new paper.Point(via.x, via.y),
        new paper.Point(end.x, end.y)
    );

    const newAnchors: Anchor[] = paperArc.segments.map(segment => ({
        point: { x: segment.point.x, y: segment.point.y },
        handleIn: { x: segment.point.x + segment.handleIn.x, y: segment.point.y + segment.handleIn.y },
        handleOut: { x: segment.point.x + segment.handleOut.x, y: segment.point.y + segment.handleOut.y },
    }));

    project.remove();

    return {
        ...baseProps,
        id: `${Date.now()}-v`,
        tool: 'pen',
        anchors: newAnchors,
        isClosed: false,
    };
}

export function rectangleToVectorPath(path: RectangleData): VectorPathData {
    const { id, x, y, width, height, rotation, ...baseProps } = path;

    let corners: Point[] = [
        { x, y }, // top-left
        { x: x + width, y }, // top-right
        { x: x + width, y: y + height }, // bottom-right
        { x, y: y + height }, // bottom-left
    ];

    if (rotation) {
        const center = { x: x + width / 2, y: y + height / 2 };
        corners = corners.map(p => rotatePoint(p, center, rotation));
    }

    const anchors: Anchor[] = corners.map(p => ({ point: p, handleIn: p, handleOut: p }));

    return {
        ...baseProps,
        id: `${Date.now()}-v`,
        tool: 'pen',
        anchors,
        isClosed: true,
    };
}

export function ellipseToVectorPath(path: EllipseData): VectorPathData {
    const { id, x, y, width, height, rotation, ...baseProps } = path;
    const rx = width / 2;
    const ry = height / 2;
    const cx = x + rx;
    const cy = y + ry;

    const kappa = 0.552284749831; 
    const ox = rx * kappa;
    const oy = ry * kappa;

    let anchors: Anchor[] = [
        { point: { x: cx, y: cy - ry }, handleIn: { x: cx - ox, y: cy - ry }, handleOut: { x: cx + ox, y: cy - ry } },
        { point: { x: cx + rx, y: cy }, handleIn: { x: cx + rx, y: cy - oy }, handleOut: { x: cx + rx, y: cy + oy } },
        { point: { x: cx, y: cy + ry }, handleIn: { x: cx + ox, y: cy + ry }, handleOut: { x: cx - ox, y: cy + ry } },
        { point: { x: cx - rx, y: cy }, handleIn: { x: cx - rx, y: cy + oy }, handleOut: { x: cx - rx, y: cy - oy } },
    ];
    
    if (rotation) {
        const center = { x: cx, y: cy };
        anchors = anchors.map(a => ({
            point: rotatePoint(a.point, center, rotation),
            handleIn: rotatePoint(a.handleIn, center, rotation),
            handleOut: rotatePoint(a.handleOut, center, rotation),
        }));
    }

    return {
        ...baseProps,
        id: `${Date.now()}-v`,
        tool: 'pen',
        anchors,
        isClosed: true,
    };
}

export function polygonToVectorPath(path: PolygonData): VectorPathData {
    const { id, x, y, width, height, rotation, sides, ...baseProps } = path;
    const vertices = getPolygonVertices(x, y, width, height, sides);

    let finalVertices = vertices;
    if (rotation) {
        const center = { x: x + width / 2, y: y + height / 2 };
        finalVertices = vertices.map(p => rotatePoint(p, center, rotation));
    }
    
    const anchors: Anchor[] = finalVertices.map(p => ({ point: p, handleIn: p, handleOut: p }));

    return {
        ...baseProps,
        id: `${Date.now()}-v`,
        tool: 'pen',
        anchors,
        isClosed: true,
    };
}

export function lineToVectorPath(path: VectorPathData): VectorPathData {
    if (path.anchors.length < 2) {
        return { ...path, tool: 'pen' };
    }

    const project = new paper.Project(document.createElement('canvas'));
    
    const paperPath = new paper.Path({
        segments: path.anchors.map(a => new paper.Point(a.point.x, a.point.y)),
        closed: path.isClosed,
    });

    paperPath.smooth({ type: 'continuous' });

    const newAnchors: Anchor[] = paperPath.segments.map(segment => {
        return {
            point: { x: segment.point.x, y: segment.point.y },
            handleIn: { x: segment.point.x + segment.handleIn.x, y: segment.point.y + segment.handleIn.y },
            handleOut: { x: segment.point.x + segment.handleOut.x, y: segment.point.y + segment.handleOut.y },
        };
    });

    project.remove();

    return {
        ...path,
        tool: 'pen',
        anchors: newAnchors,
        id: `${Date.now()}-v`,
    };
}

export function brushToVectorPath(path: BrushPathData): VectorPathData {
    if (path.points.length < 2) {
        const anchors: Anchor[] = path.points.map(p => ({ point: p, handleIn: p, handleOut: p }));
        return { ...path, tool: 'pen', anchors, id: `${Date.now()}-v` };
    }

    const project = new paper.Project(document.createElement('canvas'));
    const paperPath = new paper.Path({
        segments: path.points.map(p => new paper.Point(p.x, p.y)),
    });

    // Simplify the path to get a manageable number of anchors.
    // A higher tolerance means fewer anchors. Tying it to strokeWidth is a good heuristic.
    const tolerance = path.strokeWidth * 1.5;
    paperPath.simplify(tolerance);

    const newAnchors: Anchor[] = paperPath.segments.map(segment => ({
        point: { x: segment.point.x, y: segment.point.y },
        handleIn: { x: segment.point.x + segment.handleIn.x, y: segment.point.y + segment.handleIn.y },
        handleOut: { x: segment.point.x + segment.handleOut.x, y: segment.point.y + segment.handleOut.y },
    }));

    project.remove();

    return {
        ...path,
        tool: 'pen',
        anchors: newAnchors,
        id: `${Date.now()}-v`,
    };
}

export function simplifyPath(path: VectorPathData, tolerance: number): VectorPathData {
    if (!path.anchors || path.anchors.length < 2 || tolerance <= 0) {
        return path;
    }

    const project = new paper.Project(document.createElement('canvas'));
    
    const paperPath = new paper.Path({
        segments: path.anchors.map(a => new paper.Segment(
            new paper.Point(a.point.x, a.point.y),
            new paper.Point(a.handleIn.x - a.point.x, a.handleIn.y - a.point.y),
            new paper.Point(a.handleOut.x - a.point.x, a.handleOut.y - a.point.y)
        )),
        closed: path.isClosed,
    });
    
    paperPath.simplify(tolerance);

    const newAnchors: Anchor[] = paperPath.segments.map(segment => ({
        point: { x: segment.point.x, y: segment.point.y },
        handleIn: { x: segment.point.x + segment.handleIn.x, y: segment.point.y + segment.handleIn.y },
        handleOut: { x: segment.point.x + segment.handleOut.x, y: segment.point.y + segment.handleOut.y },
    }));

    project.remove();
    
    if (newAnchors.length === 0) {
      return path; 
    }

    return {
        ...path,
        anchors: newAnchors,
    };
}