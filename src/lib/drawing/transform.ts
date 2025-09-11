/**
 * 本文件包含了用于对画布上的对象进行几何变换的函数，如移动、旋转、缩放等。
 */
import type { AnyPath, Point, RectangleData, EllipseData, ResizeHandlePosition, VectorPathData, ImageData, BrushPathData, PolygonData, ArcData, GroupData, TextData, FrameData, BBox } from '../../types';
import { rotatePoint } from './geom';
import { rectangleToVectorPath, ellipseToVectorPath, polygonToVectorPath } from './convert';

/**
 * 调整图形的大小。
 * @param originalPath - 原始图形数据。
 * @param handle - 拖拽的控制手柄位置。
 * @param currentPos - 当前指针位置。
 * @param initialPos - 初始指针位置。
 * @param keepAspectRatio - 是否保持宽高比。
 * @param rotationCenter - （可选）旋转中心点。
 * @returns 返回一个调整大小后的新图形对象。
 */
export function resizePath(
    originalPath: RectangleData | EllipseData | ImageData | PolygonData | TextData | FrameData,
    handle: ResizeHandlePosition,
    currentPos: Point,
    initialPos: Point,
    keepAspectRatio: boolean,
    rotationCenter?: Point
): RectangleData | EllipseData | ImageData | PolygonData | TextData | FrameData {
    const { rotation } = originalPath;

    let localCurrentPos = currentPos;

    if (rotation) {
        const center = rotationCenter || { 
            x: originalPath.x + originalPath.width / 2, 
            y: originalPath.y + originalPath.height / 2 
        };
        localCurrentPos = rotatePoint(currentPos, center, -rotation);
    }
    
    const { x: oldX, y: oldY, width: oldWidth, height: oldHeight } = originalPath;

    // 定义锚点，即与被拖动控制点相对的点。
    const anchor = {
        x: handle.includes('left') ? oldX + oldWidth : oldX,
        y: handle.includes('top') ? oldY + oldHeight : oldY,
    };
    
    // 对于边控制点，锚点是一条线，但其中一个坐标是固定的。
    // 另一个坐标是原始框在该轴上的中心。
    if (!handle.includes('left') && !handle.includes('right')) { // top or bottom
        anchor.x = oldX + oldWidth / 2;
    }
    if (!handle.includes('top') && !handle.includes('bottom')) { // left or right
        anchor.y = oldY + oldHeight / 2;
    }

    // 计算从锚点到鼠标的位移向量
    let dxFromAnchor = localCurrentPos.x - anchor.x;
    let dyFromAnchor = localCurrentPos.y - anchor.y;

    if (keepAspectRatio && oldWidth > 0 && oldHeight > 0) {
        const isCorner = (handle.includes('left') || handle.includes('right')) && (handle.includes('top') || handle.includes('bottom'));
        const targetAspectRatio = oldWidth / oldHeight;

        if (isCorner) {
            // 为了使调整大小感觉直观，我们计算两个可能的矩形：
            // 一个受鼠标 X 位置约束，一个受 Y 位置约束。
            // 然后，我们选择那个被拖动的角点更接近实际鼠标位置的矩形。
            // 这可以防止在鼠标移动的主导轴改变时发生突然跳动。

            const distSq = (p1: Point, p2: Point) => (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;

            // 选项1：调整大小由鼠标的 X 轴移动驱动。
            const newWidth_from_x = Math.abs(dxFromAnchor);
            const newHeight_from_x = newWidth_from_x / targetAspectRatio;
            const finalPoint_from_x = {
                x: anchor.x + newWidth_from_x * Math.sign(dxFromAnchor),
                y: anchor.y + newHeight_from_x * Math.sign(dyFromAnchor || (handle.includes('bottom') ? 1 : -1))
            };

            // 选项2：调整大小由鼠标的 Y 轴移动驱动。
            const newHeight_from_y = Math.abs(dyFromAnchor);
            const newWidth_from_y = newHeight_from_y * targetAspectRatio;
             const finalPoint_from_y = {
                x: anchor.x + newWidth_from_y * Math.sign(dxFromAnchor || (handle.includes('right') ? 1 : -1)),
                y: anchor.y + newHeight_from_y * Math.sign(dyFromAnchor)
            };

            // 比较哪个选项的角点更接近鼠标光标。
            if (distSq(localCurrentPos, finalPoint_from_x) < distSq(localCurrentPos, finalPoint_from_y)) {
                // X 驱动的调整大小更合适。调整 dy。
                dyFromAnchor = newHeight_from_x * Math.sign(dyFromAnchor || (handle.includes('bottom') ? 1 : -1));
            } else {
                // Y 驱动的调整大小更合适。调整 dx。
                dxFromAnchor = newWidth_from_y * Math.sign(dxFromAnchor || (handle.includes('right') ? 1 : -1));
            }
        } else if (handle.includes('left') || handle.includes('right')) { // horizontal handles
            dyFromAnchor = (Math.abs(dxFromAnchor) / targetAspectRatio) * Math.sign(dyFromAnchor || 1);
        } else { // vertical handles
            dxFromAnchor = (Math.abs(dyFromAnchor) * targetAspectRatio) * Math.sign(dxFromAnchor || 1);
        }
    }
    
    const finalPoint = {
        x: anchor.x + dxFromAnchor,
        y: anchor.y + dyFromAnchor,
    };

    const affectsX = handle.includes('left') || handle.includes('right');
    const affectsY = handle.includes('top') || handle.includes('bottom');

    let newX = oldX;
    let newY = oldY;
    let newWidth = oldWidth;
    let newHeight = oldHeight;

    if (affectsX || (keepAspectRatio && affectsY)) {
        newX = Math.min(anchor.x, finalPoint.x);
        newWidth = Math.abs(dxFromAnchor);
    }

    if (affectsY || (keepAspectRatio && affectsX)) {
        newY = Math.min(anchor.y, finalPoint.y);
        newHeight = Math.abs(dyFromAnchor);
    }

    if (!affectsX) {
        newX = anchor.x - newWidth / 2;
    }
    if (!affectsY) {
        newY = anchor.y - newHeight / 2;
    }

    return { ...originalPath, x: newX, y: newY, width: newWidth, height: newHeight };
}


/**
 * 变换裁剪矩形。
 * @param initialCropRect - 拖拽开始时的裁剪矩形。
 * @param originalImage - 正在裁剪的原始图像数据。
 * @param handle - 拖拽的控制手柄位置。
 * @param currentPos - 当前指针位置。
 * @param initialPos - 初始指针位置。
 * @returns 返回一个新的裁剪 BBox 对象。
 */
export function transformCropRect(
    initialCropRect: BBox,
    originalImage: ImageData,
    handle: ResizeHandlePosition,
    currentPos: Point,
    initialPos: Point,
): BBox {
    const rotationCenter = {
        x: originalImage.x + originalImage.width / 2,
        y: originalImage.y + originalImage.height / 2,
    };
    
    const resized = resizePath(
        { ...initialCropRect, tool: 'rectangle', id: '', color:'', fill:'', fillStyle:'', strokeWidth:0, roughness:0,bowing:0,fillWeight:0,hachureAngle:0,hachureGap:0,curveTightness:0,curveStepCount:9, rotation: originalImage.rotation },
        handle,
        currentPos,
        initialPos,
        false, // no aspect ratio for crop
        rotationCenter
    );

    // Now constrain the result within originalImage bounds
    const o_x1 = originalImage.x;
    const o_y1 = originalImage.y;
    const o_x2 = originalImage.x + originalImage.width;
    const o_y2 = originalImage.y + originalImage.height;

    const r_x1 = resized.x;
    const r_y1 = resized.y;
    const r_x2 = resized.x + resized.width;
    const r_y2 = resized.y + resized.height;

    const final_x1 = Math.max(r_x1, o_x1);
    const final_y1 = Math.max(r_y1, o_y1);
    const final_x2 = Math.min(r_x2, o_x2);
    const final_y2 = Math.min(r_y2, o_y2);
    
    return {
        x: final_x1,
        y: final_y1,
        width: Math.max(0, final_x2 - final_x1),
        height: Math.max(0, final_y2 - final_y1),
    };
}


/**
 * 移动图形。
 * @param path - 要移动的图形。
 * @param dx - X 轴上的移动距离。
 * @param dy - Y 轴上的移动距离。
 * @returns 返回一个移动后的新图形对象。
 */
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
        case 'frame':
        case 'rectangle':
        case 'ellipse':
        case 'image':
        case 'polygon':
        case 'text':
            return { ...path, x: path.x + dx, y: path.y + dy };
        case 'group': {
            const groupPath = path as GroupData;
            const newChildren = groupPath.children.map(child => movePath(child, dx, dy));
            return { ...path, children: newChildren };
        }
    }
}

/**
 * 旋转图形。
 * @param path - 要旋转的图形。
 * @param center - 旋转中心点。
 * @param angle - 旋转角度（弧度）。
 * @returns 返回一个旋转后的新图形对象。
 */
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
        case 'frame':
        case 'rectangle':
        case 'ellipse':
        case 'image':
        case 'polygon':
        case 'text': {
            const shape = path as RectangleData | EllipseData | ImageData | PolygonData | TextData | FrameData;
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

/**
 * 翻转图形。
 * @param path - 要翻转的图形。
 * @param center - 翻转中心点。
 * @param axis - 翻转轴（水平或垂直）。
 * @returns 返回一个翻转后的新图形对象。
 */
export async function flipPath(path: AnyPath, center: Point, axis: 'horizontal' | 'vertical'): Promise<AnyPath> {
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
                const newHandleIn = flipPoint(anchor.handleIn);
                const newHandleOut = flipPoint(anchor.handleOut);
                return { point: newPoint, handleIn: newHandleIn, handleOut: newHandleOut };
            });
            return { ...path, anchors: newAnchors };
        }
        case 'image': {
            const imgPath = path as ImageData;

            const flippedSrc = await new Promise<string>((resolve, reject) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error("Could not get canvas context"));
                
                const img = new Image();
                img.onload = () => {
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    ctx.save();
                    if (axis === 'horizontal') {
                        ctx.translate(canvas.width, 0);
                        ctx.scale(-1, 1);
                    } else { // vertical
                        ctx.translate(0, canvas.height);
                        ctx.scale(1, -1);
                    }
                    ctx.drawImage(img, 0, 0);
                    ctx.restore();
                    resolve(canvas.toDataURL());
                };
                img.onerror = (err) => reject(err);
                img.crossOrigin = "anonymous";
                img.src = imgPath.src;
            });

            const { x, y, width, height, rotation } = imgPath;
            const shapeCenter = { x: x + width / 2, y: y + height / 2 };
            const newShapeCenter = flipPoint(shapeCenter);
            const newX = newShapeCenter.x - width / 2;
            const newY = newShapeCenter.y - height / 2;
            const newRotation = -(rotation ?? 0);
            
            return {
                ...imgPath,
                x: newX,
                y: newY,
                rotation: newRotation,
                src: flippedSrc,
            };
        }
        case 'text': {
            const textPath = path as TextData;
            const { x, y, width, height, rotation } = textPath;
            const shapeCenter = { x: x + width / 2, y: y + height / 2 };
            const newShapeCenter = flipPoint(shapeCenter);
            const newX = newShapeCenter.x - width / 2;
            const newY = newShapeCenter.y - height / 2;
            const newRotation = -(rotation ?? 0);

            return {
                ...textPath,
                x: newX,
                y: newY,
                rotation: newRotation,
            };
        }
        case 'frame':
        case 'rectangle':
        case 'ellipse':
        case 'polygon': {
            let vectorPath: VectorPathData;
            if (path.tool === 'rectangle' || path.tool === 'frame') {
                vectorPath = rectangleToVectorPath(path as RectangleData);
            } else if (path.tool === 'ellipse') {
                vectorPath = ellipseToVectorPath(path as EllipseData);
            } else if (path.tool === 'polygon') {
                vectorPath = polygonToVectorPath(path as PolygonData);
            } else {
                 // FIX: This `else` block is unreachable because the `case` statement covers all possible tool types.
                 // The original code `...path` caused a "Spread types may only be created from object types" error
                 // because TypeScript correctly inferred `path` as `never` here.
                 // Replacing it with a `throw` makes the logic explicit and safe, resolving the type error.
                 throw new Error(`Unreachable code: unexpected tool '${(path as AnyPath).tool}' in flipPath`);
            }
            
            const flippedAnchors = vectorPath.anchors.map(anchor => {
                const newPoint = flipPoint(anchor.point);
                const newHandleIn = flipPoint(anchor.handleIn);
                const newHandleOut = flipPoint(anchor.handleOut);
                return { point: newPoint, handleIn: newHandleIn, handleOut: newHandleOut };
            });

            const { id, ...baseProps } = path as any;
            
            return {
                ...baseProps,
                id: path.id,
                tool: 'pen',
                anchors: flippedAnchors,
                isClosed: true
            } as VectorPathData;
        }
        case 'group': {
            const groupPath = path as GroupData;
            const newChildrenPromises = groupPath.children.map(child => flipPath(child, center, axis));
            const newChildren = await Promise.all(newChildrenPromises);
            return { ...path, children: newChildren };
        }
    }
}

/**
 * 缩放图形。
 * @param path - 要缩放的图形。
 * @param pivot - 缩放基准点。
 * @param scaleX - X 轴缩放因子。
 * @param scaleY - Y 轴缩放因子。
 * @returns 返回一个缩放后的新图形对象。
 */
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
    case 'frame':
    case 'rectangle':
    case 'ellipse':
    case 'image':
    case 'polygon':
    case 'text':
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