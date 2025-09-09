/**
 * 本文件包含了用于图形类型转换和路径简化的函数。
 */
import paper from 'paper';
import type { AnyPath, Point, RectangleData, EllipseData, VectorPathData, Anchor, BrushPathData, PolygonData, ArcData } from '../../types';
import { rotatePoint } from './geom';
import { getPolygonVertices } from './polygon';

/**
 * 将圆弧数据转换为矢量路径。
 * @param path - 要转换的圆弧数据。
 * @returns 返回一个可编辑的矢量路径对象。
 */
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

/**
 * 将矩形数据转换为矢量路径。
 * @param path - 要转换的矩形数据。
 * @returns 返回一个可编辑的矢量路径对象。
 */
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

/**
 * 将椭圆数据转换为矢量路径。
 * @param path - 要转换的椭圆数据。
 * @returns 返回一个可编辑的矢量路径对象。
 */
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

/**
 * 将多边形数据转换为矢量路径。
 * @param path - 要转换的多边形数据。
 * @returns 返回一个可编辑的矢量路径对象。
 */
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

/**
 * 将线条数据转换为矢量路径。
 * @param path - 要转换的线条数据。
 * @returns 返回一个可编辑的矢量路径对象。
 */
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

/**
 * 将画笔数据转换为矢量路径。
 * @param path - 要转换的画笔数据。
 * @returns 返回一个可编辑的矢量路径对象。
 */
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

/**
 * 简化矢量路径。
 * @param path - 要简化的矢量路径。
 * @param tolerance - 简化的容差值。
 * @returns 返回一个简化后的新矢量路径对象。
 */
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
