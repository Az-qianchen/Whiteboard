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
    _initialPos: Point,
    keepAspectRatio: boolean,
    rotationCenter?: Point
): RectangleData | EllipseData | ImageData | PolygonData | TextData | FrameData {
    const { rotation } = originalPath;

    const defaultCenter = {
        x: originalPath.x + originalPath.width / 2,
        y: originalPath.y + originalPath.height / 2,
    };
    const pivot = rotationCenter || defaultCenter;

    let localCurrentPos = currentPos;
    let localInitialPos = _initialPos;

    if (rotation) {
        localCurrentPos = rotatePoint(currentPos, pivot, -rotation);
        localInitialPos = rotatePoint(_initialPos, pivot, -rotation);
    }

    const { x: oldX, y: oldY, width: oldWidth, height: oldHeight } = originalPath;

    // 依据初始指针位置选择对角点作为锚点
    const anchor = {
        x: handle.includes('left') ? oldX + oldWidth : oldX,
        y: handle.includes('top') ? oldY + oldHeight : oldY,
    };

    if (handle === 'top' || handle === 'bottom') {
        anchor.x = localInitialPos.x < defaultCenter.x ? oldX + oldWidth : oldX;
    }
    if (handle === 'left' || handle === 'right') {
        anchor.y = localInitialPos.y < defaultCenter.y ? oldY + oldHeight : oldY;
    }

    const anchorGlobal = rotation ? rotatePoint(anchor, pivot, rotation) : anchor;

    // 计算从锚点到当前指针的位移（局部坐标用于尺寸与翻转）
    const dxLocal = localCurrentPos.x - anchor.x;
    const dyLocal = localCurrentPos.y - anchor.y;
    const dxInitialLocal = localInitialPos.x - anchor.x;
    const dyInitialLocal = localInitialPos.y - anchor.y;

    const affectsX = handle.includes('left') || handle.includes('right');
    const affectsY = handle.includes('top') || handle.includes('bottom');

    const baseWidth = handle.includes('left') ? -oldWidth : oldWidth;
    const baseHeight = handle.includes('top') ? -oldHeight : oldHeight;

    let newWidth = affectsX ? dxLocal : baseWidth;
    let newHeight = affectsY ? dyLocal : baseHeight;

    if (keepAspectRatio && oldWidth > 0 && oldHeight > 0) {
        const targetRatio = oldWidth / oldHeight;
        const isCorner = affectsX && affectsY;

        if (isCorner) {
            if (Math.abs(newWidth) > Math.abs(newHeight) * targetRatio) {
                newHeight = Math.abs(newWidth) / targetRatio * Math.sign(newHeight || (handle.includes('bottom') ? 1 : -1));
            } else {
                newWidth = Math.abs(newHeight) * targetRatio * Math.sign(newWidth || (handle.includes('right') ? 1 : -1));
            }
        } else if (affectsX) {
            newHeight = Math.abs(newWidth) / targetRatio * Math.sign(newHeight || (handle.includes('bottom') ? 1 : -1));
        } else if (affectsY) {
            newWidth = Math.abs(newHeight) * targetRatio * Math.sign(newWidth || (handle.includes('right') ? 1 : -1));
        }
    }

    let scaleX = affectsX ? Math.abs(newWidth / baseWidth) : 1;
    let scaleY = affectsY ? Math.abs(newHeight / baseHeight) : 1;

    if (affectsX) {
        const baseSign = Math.sign(dxInitialLocal);
        const currentSign = Math.sign(dxLocal);
        if (baseSign && currentSign && baseSign !== currentSign) {
            scaleX *= -1;
        }
    }
    if (affectsY) {
        const baseSign = Math.sign(dyInitialLocal);
        const currentSign = Math.sign(dyLocal);
        if (baseSign && currentSign && baseSign !== currentSign) {
            scaleY *= -1;
        }
    }

    let result = scalePath(originalPath, anchor, scaleX, scaleY);

    if (rotation) {
        const newCenter = { x: result.x + result.width / 2, y: result.y + result.height / 2 };
        const rotationPivot = rotationCenter ?? newCenter; // 有外部旋转中心时使用该点作为旋转轴
        const anchorGlobalNew = rotatePoint(anchor, rotationPivot, rotation);
        const translation = {
            x: anchorGlobal.x - anchorGlobalNew.x,
            y: anchorGlobal.y - anchorGlobalNew.y,
        };
        result = movePath(result, translation.x, translation.y);
    }

    return result;
}

/**
 * 根据旋转角度转换尺寸调整手柄的位置。
 * @param handle 原始手柄位置（未旋转）。
 * @param angle 旋转角度（弧度，顺时针为正）。
 * @returns 旋转后对应的手柄位置。
 */
export function rotateResizeHandle(handle: ResizeHandlePosition, angle: number): ResizeHandlePosition {
    const vectors: Record<ResizeHandlePosition, Point> = {
        'top-left': { x: -1, y: -1 },
        'top': { x: 0, y: -1 },
        'top-right': { x: 1, y: -1 },
        'right': { x: 1, y: 0 },
        'bottom-right': { x: 1, y: 1 },
        'bottom': { x: 0, y: 1 },
        'bottom-left': { x: -1, y: 1 },
        'left': { x: -1, y: 0 },
    };

    const v = vectors[handle];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = v.x * cos - v.y * sin;
    const ry = v.x * sin + v.y * cos;
    const sx = Math.abs(rx) < 1e-8 ? 0 : Math.sign(rx);
    const sy = Math.abs(ry) < 1e-8 ? 0 : Math.sign(ry);

    if (sx === 0 && sy === -1) return 'top';
    if (sx === 1 && sy === -1) return 'top-right';
    if (sx === 1 && sy === 0) return 'right';
    if (sx === 1 && sy === 1) return 'bottom-right';
    if (sx === 0 && sy === 1) return 'bottom';
    if (sx === -1 && sy === 1) return 'bottom-left';
    if (sx === -1 && sy === 0) return 'left';
    return 'top-left';
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
    _initialPos: Point,
): BBox {
    const rotation = originalImage.rotation ?? 0;
    const center = {
        x: originalImage.x + originalImage.width / 2,
        y: originalImage.y + originalImage.height / 2,
    };

    const localCurrent = rotatePoint(currentPos, center, -rotation);

    let x1 = initialCropRect.x;
    let y1 = initialCropRect.y;
    let x2 = initialCropRect.x + initialCropRect.width;
    let y2 = initialCropRect.y + initialCropRect.height;

    if (handle.includes('left')) x1 = localCurrent.x;
    if (handle.includes('right')) x2 = localCurrent.x;
    if (handle.includes('top')) y1 = localCurrent.y;
    if (handle.includes('bottom')) y2 = localCurrent.y;

    const newX1 = Math.min(x1, x2);
    const newY1 = Math.min(y1, y2);
    const newX2 = Math.max(x1, x2);
    const newY2 = Math.max(y1, y2);

    const ix1 = originalImage.x;
    const iy1 = originalImage.y;
    const ix2 = originalImage.x + originalImage.width;
    const iy2 = originalImage.y + originalImage.height;

    const finalX1 = Math.max(newX1, ix1);
    const finalY1 = Math.max(newY1, iy1);
    const finalX2 = Math.min(newX2, ix2);
    const finalY2 = Math.min(newY2, iy2);

    return {
        x: finalX1,
        y: finalY1,
        width: Math.max(0, finalX2 - finalX1),
        height: Math.max(0, finalY2 - finalY1),
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
                 // Unreachable: all tool types are handled above; throw for safety.
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
        const newScaleX = (path.scaleX ?? 1) * (scaleX < 0 ? -1 : 1);
        const newScaleY = (path.scaleY ?? 1) * (scaleY < 0 ? -1 : 1);
      return { ...path, x: newX, y: newY, width: Math.abs(scaledWidth), height: Math.abs(scaledHeight), scaleX: newScaleX, scaleY: newScaleY };
    case 'group':
        return { ...path, children: (path as GroupData).children.map(child => scalePath(child, pivot, scaleX, scaleY)) };
  }
}