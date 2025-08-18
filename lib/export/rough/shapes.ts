import type { RoughSVG } from 'roughjs/bin/svg';
import type { RectangleData, EllipseData, ImageData, PolygonData } from '../../types';
import { getPolygonPathD } from '../../drawing';

/**
 * Generates an SVG path string for a rounded rectangle.
 * @returns An SVG path `d` attribute string.
 */
function getRoundedRectPathD(x: number, y: number, width: number, height: number, radius: number): string {
    const r = Math.min(radius, width / 2, height / 2);
    if (r <= 0.1) {
        return `M${x},${y} L${x + width},${y} L${x + width},${y + height} L${x},${y + height} Z`;
    }
    
    const x_r = x + r;
    const x_w_r = x + width - r;
    const y_r = y + r;
    const y_h_r = y + height - r;
    const x_w = x + width;
    const y_h = y + height;

    return `M${x_r},${y} L${x_w_r},${y} A${r},${r} 0 0 1 ${x_w},${y_r} L${x_w},${y_h_r} A${r},${r} 0 0 1 ${x_w_r},${y_h} L${x_r},${y_h} A${r},${r} 0 0 1 ${x},${y_h_r} L${x},${y_r} A${r},${r} 0 0 1 ${x_r},${y} Z`;
}

export function renderImage(data: ImageData): SVGElement {
    const imgData = data as ImageData;
        
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
        g.appendChild(image);
        return g;
    } else {
        const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        image.setAttribute('href', imgData.src);
        image.setAttribute('x', String(imgData.x));
        image.setAttribute('y', String(imgData.y));
        image.setAttribute('width', String(imgData.width));
        image.setAttribute('height', String(imgData.height));
        return image;
    }
}

export function renderRoughShape(rc: RoughSVG, data: RectangleData | EllipseData | PolygonData, options: any): SVGElement | null {
    if (data.tool === 'ellipse') {
        const { x, y, width, height } = data as EllipseData;
        const cx = x + width / 2;
        const cy = y + height / 2;
        return rc.ellipse(cx, cy, width, height, options);
    } else if (data.tool === 'rectangle') {
        const { x, y, width, height, borderRadius } = data as RectangleData;
        // Always use rc.path for rectangles to ensure a single path is generated,
        // allowing stroke-linejoin to correctly round the corners.
        const d = getRoundedRectPathD(x, y, width, height, borderRadius ?? 0);
        return rc.path(d, options);
    } else if (data.tool === 'polygon') {
        const { x, y, width, height, sides, borderRadius } = data as PolygonData;
        const d = getPolygonPathD(x, y, width, height, sides, borderRadius);
        return rc.path(d, options);
    }
    return null;
}