import type { RoughSVG } from 'roughjs/bin/svg';
import type { RectangleData, EllipseData, ImageData, PolygonData, FrameData } from '@/types';
import {
  getPolygonPathD,
  getRoundedRectPathD,
  getWarpedCorners,
  getQuadProjectiveMatrix,
  projectiveMatrixToCss,
} from '@/lib/drawing';

export function renderImage(data: ImageData): SVGElement {
    const imgData = data as ImageData;
    if (!imgData.src) {
        console.warn('renderImage called without data URL. Ensure image sources are hydrated before rendering.');
        return document.createElementNS('http://www.w3.org/2000/svg', 'g');
    }

    const warpOffsets = imgData.warp;
    const hasWarp = !!warpOffsets && (
        Math.abs(warpOffsets.topLeft.x) > 1e-6 || Math.abs(warpOffsets.topLeft.y) > 1e-6 ||
        Math.abs(warpOffsets.topRight.x) > 1e-6 || Math.abs(warpOffsets.topRight.y) > 1e-6 ||
        Math.abs(warpOffsets.bottomRight.x) > 1e-6 || Math.abs(warpOffsets.bottomRight.y) > 1e-6 ||
        Math.abs(warpOffsets.bottomLeft.x) > 1e-6 || Math.abs(warpOffsets.bottomLeft.y) > 1e-6
    );

    if (hasWarp) {
        const corners = getWarpedCorners(imgData);
        const matrix = getQuadProjectiveMatrix(imgData.width, imgData.height, corners);

        if (matrix) {
            const SVG_NS = 'http://www.w3.org/2000/svg';
            const group = document.createElementNS(SVG_NS, 'g');
            const image = document.createElementNS(SVG_NS, 'image');
            image.setAttribute('href', imgData.src!);
            image.setAttribute('width', String(imgData.width));
            image.setAttribute('height', String(imgData.height));
            image.setAttribute('x', '0');
            image.setAttribute('y', '0');
            image.setAttribute('preserveAspectRatio', 'none');
            image.style.transformOrigin = '0 0';
            image.style.setProperty('transform-box', 'fill-box');
            image.style.transform = projectiveMatrixToCss(matrix);
            group.appendChild(image);

            if (imgData.opacity !== undefined && imgData.opacity < 1) {
                group.setAttribute('opacity', String(imgData.opacity));
            }

            return group;
        }

        console.warn('Failed to compute quad warp for image.', data.id);
    }

    if (imgData.borderRadius && imgData.borderRadius > 0) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        const clipId = `clip-${data.id}`;
        clipPath.setAttribute('id', clipId);

        const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        clipRect.setAttribute('x', String(imgData.x));
        clipRect.setAttribute('y', String(imgData.y));
        clipRect.setAttribute('width', String(imgData.width));
        clipRect.setAttribute('height', String(imgData.height));
        clipRect.setAttribute('rx', String(imgData.borderRadius));
        clipRect.setAttribute('ry', String(imgData.borderRadius));
        
        clipPath.appendChild(clipRect);
        defs.appendChild(clipPath);
        g.appendChild(defs);

        const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        image.setAttribute('href', imgData.src);
        image.setAttribute('x', String(imgData.x));
        image.setAttribute('y', String(imgData.y));
        image.setAttribute('width', String(imgData.width));
        image.setAttribute('height', String(imgData.height));
        image.setAttribute('clip-path', `url(#${clipId})`);
        image.setAttribute('preserveAspectRatio', 'none');
        g.appendChild(image);
        return g;
    } else {
        const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        image.setAttribute('href', imgData.src);
        image.setAttribute('x', String(imgData.x));
        image.setAttribute('y', String(imgData.y));
        image.setAttribute('width', String(imgData.width));
        image.setAttribute('height', String(imgData.height));
        image.setAttribute('preserveAspectRatio', 'none');
        return image;
    }
}

export function renderRoughShape(rc: RoughSVG, data: RectangleData | EllipseData | PolygonData | FrameData, options: any): SVGElement | null {
    if (data.tool === 'ellipse') {
        const { x, y, width, height } = data as EllipseData;
        const cx = x + width / 2;
        const cy = y + height / 2;
        return rc.ellipse(cx, cy, width, height, options);
    } else if (data.tool === 'rectangle') {
        const rectangle = data as RectangleData;
        if (rectangle.warp) {
            const corners = getWarpedCorners(rectangle);
            const d = `M ${corners.topLeft.x} ${corners.topLeft.y} L ${corners.topRight.x} ${corners.topRight.y} L ${corners.bottomRight.x} ${corners.bottomRight.y} L ${corners.bottomLeft.x} ${corners.bottomLeft.y} Z`;
            return rc.path(d, options);
        }
        const { x, y, width, height, borderRadius } = rectangle;
        const d = getRoundedRectPathD(x, y, width, height, borderRadius ?? 0);
        return rc.path(d, options);
    } else if (data.tool === 'frame') {
        const { x, y, width, height } = data as FrameData;
        const frameOptions = {
            ...options,
            strokeWidth: 2,
            strokeLineDash: [8, 4],
            roughness: 0,
            bowing: 0
        };
        const d = getRoundedRectPathD(x, y, width, height, 0);
        return rc.path(d, frameOptions);
    } else if (data.tool === 'polygon') {
        const { x, y, width, height, sides, borderRadius } = data as PolygonData;
        const d = getPolygonPathD(x, y, width, height, sides, borderRadius);
        return rc.path(d, options);
    }
    return null;
}