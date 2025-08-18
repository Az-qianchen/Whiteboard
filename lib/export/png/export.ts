

import type { AnyPath } from '../../types';
import { getPathsBoundingBox } from '../../drawing';
import { pathsToSvgString } from '../svg/export';

/**
 * Creates a PNG Blob from an array of path data.
 * @param paths The array of paths to render.
 * @param backgroundColor The background color for the canvas.
 * @returns A Promise that resolves to a Blob, or null.
 */
export function pathsToPngBlob(paths: AnyPath[], backgroundColor: string): Promise<Blob | null> {
    return new Promise((resolve) => {
        const svgString = pathsToSvgString(paths);
        if (!svgString) {
            resolve(null);
            return;
        }

        const bbox = getPathsBoundingBox(paths, true);
        if (!bbox) {
            resolve(null);
            return;
        }

        const padding = 20;
        const canvas = document.createElement('canvas');
        const scale = window.devicePixelRatio || 1;
        canvas.width = (bbox.width + padding * 2) * scale;
        canvas.height = (bbox.height + padding * 2) * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            resolve(null);
            return;
        }
        
        // Fill background first, on an unscaled context
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.scale(scale, scale);

        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/png');
        };
        img.onerror = () => {
            resolve(null);
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
    });
}