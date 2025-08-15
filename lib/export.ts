/**
 * This file contains functions for exporting drawings to SVG and PNG formats.
 * It includes a shared rendering function to convert path data into SVG nodes.
 */
import rough from 'roughjs/bin/rough';
import type { RoughSVG } from 'roughjs/bin/svg';
import type { AnyPath, VectorPathData, RectangleData, EllipseData, ImageData } from '../types';
import { getPathsBoundingBox, getPathBoundingBox } from './geometry';
import { movePath } from './utils';
import { samplePath } from './path-fitting';

/**
 * Renders an AnyPath object into an SVGElement using a given RoughJS instance.
 * This is a shared utility used by the main whiteboard and the export functions.
 * @param rc - The RoughSVG instance to use for rendering.
 * @param data - The path data object to render.
 * @returns An SVGElement (e.g., <path>, <g>) representing the rendered path, or null.
 */
export function renderPathNode(rc: RoughSVG, data: AnyPath): SVGElement | null {
    if (data.tool === 'image') {
        const imgData = data as ImageData;
        const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        image.setAttribute('href', imgData.src);
        image.setAttribute('x', String(imgData.x));
        image.setAttribute('y', String(imgData.y));
        image.setAttribute('width', String(imgData.width));
        image.setAttribute('height', String(imgData.height));
        image.setAttribute('opacity', String(imgData.opacity));

        if (imgData.rotation) {
            const cx = imgData.x + imgData.width / 2;
            const cy = imgData.y + imgData.height / 2;
            const deg = imgData.rotation * 180 / Math.PI;
            const transform = `rotate(${deg}, ${cx}, ${cy})`;
            
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('transform', transform);
            g.appendChild(image);
            return g;
        }

        return image;
    }

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
        if (data.fillWeight > 0) options.fillWeight = data.fillWeight;
        if (data.hachureGap > 0) options.hachureGap = data.hachureGap;
        options.hachureAngle = data.hachureAngle;
    }
    
    let node: SVGElement | null = null;
    
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
        case 'line': {
            const pathData = data as VectorPathData;
            if (!pathData.anchors || pathData.anchors.length === 0) return null;

            if (pathData.anchors.length === 1) {
                const dotOptions = { ...options, fill: pathData.color, fillStyle: 'solid' };
                node = rc.circle(pathData.anchors[0].point.x, pathData.anchors[0].point.y, data.strokeWidth, dotOptions);
            } else {
                const points = (data.tool === 'pen' ? samplePath(pathData.anchors, 50, !!pathData.isClosed) : pathData.anchors.map(a => a.point))
                    .map(p => [p.x, p.y] as [number, number]);
                node = rc.curve(points, options);
            }
            break;
        }
    }
    
    if (!node) return null;

    if (data.rotation) {
        const bbox = getPathBoundingBox(data, false);
        const cx = bbox.x + bbox.width / 2;
        const cy = bbox.y + bbox.height / 2;
        const deg = data.rotation * 180 / Math.PI;
        const transform = `rotate(${deg}, ${cx}, ${cy})`;
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', transform);
        g.appendChild(node);
        return g;
    }

    return node;
}


/**
 * Converts an array of paths into a self-contained SVG string.
 * @param paths - The paths to include in the SVG.
 * @returns An SVG string, or an empty string if no paths are provided.
 */
export function pathsToSvgString(paths: AnyPath[]): string {
    if (paths.length === 0) return '';
    const PADDING = 10;
    const bbox = getPathsBoundingBox(paths);
    if (!bbox) return '';

    const width = Math.max(1, bbox.width + PADDING * 2);
    const height = Math.max(1, bbox.height + PADDING * 2);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    svg.setAttribute('width', `${width}`);
    svg.setAttribute('height', `${height}`);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const rc = rough.svg(svg);

    paths.forEach(path => {
        const translatedPath = movePath(path, -bbox.x + PADDING, -bbox.y + PADDING);
        const node = renderPathNode(rc, translatedPath);
        if (node) {
            svg.appendChild(node);
        }
    });

    return new XMLSerializer().serializeToString(svg);
}

/**
 * Converts an array of paths into a PNG image Blob.
 * @param paths - The paths to render.
 * @returns A Promise that resolves to a PNG Blob, or null if rendering fails.
 */
export async function pathsToPngBlob(paths: AnyPath[]): Promise<Blob | null> {
    const svgString = pathsToSvgString(paths);
    if (!svgString) return null;

    const PADDING = 10;
    const bbox = getPathsBoundingBox(paths);
    if (!bbox) return null;
    
    // Ensure dimensions are at least 1px
    const width = Math.max(1, bbox.width + PADDING * 2);
    const height = Math.max(1, bbox.height + PADDING * 2);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Use device pixel ratio for sharper images on high-DPI screens
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            canvas.toBlob(blob => resolve(blob), 'image/png');
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            console.error("Failed to load SVG image for PNG conversion:", err);
            reject(new Error("Could not load SVG image for PNG conversion."));
        };
        img.src = url;
    });
}