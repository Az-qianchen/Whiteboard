import type { RoughSVG } from 'roughjs/bin/svg';
import type { RectangleData, EllipseData, ImageData, PolygonData, FrameData, Point } from '@/types';
import { getPolygonPathD, getRoundedRectPathD, getWarpedCorners } from '@/lib/drawing';

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
        const width = imgData.width;
        const height = imgData.height;
        const srcTri1: [Point, Point, Point] = [
            { x: 0, y: 0 },
            { x: width, y: 0 },
            { x: 0, y: height },
        ];
        const dstTri1: [Point, Point, Point] = [
            corners.topLeft,
            corners.topRight,
            corners.bottomLeft,
        ];
        const srcTri2: [Point, Point, Point] = [
            { x: width, y: 0 },
            { x: width, y: height },
            { x: 0, y: height },
        ];
        const dstTri2: [Point, Point, Point] = [
            corners.topRight,
            corners.bottomRight,
            corners.bottomLeft,
        ];

        const buildAffine = (p0: Point, p1: Point, p2: Point) => ({
            a: p1.x - p0.x,
            b: p2.x - p0.x,
            c: p0.x,
            d: p1.y - p0.y,
            e: p2.y - p0.y,
            f: p0.y,
        });

        const invertAffine = (m: { a: number; b: number; c: number; d: number; e: number; f: number }) => {
            const det = m.a * m.e - m.b * m.d;
            if (Math.abs(det) < 1e-8) {
                return null;
            }
            return {
                a: m.e / det,
                b: -m.b / det,
                c: (m.b * m.f - m.e * m.c) / det,
                d: -m.d / det,
                e: m.a / det,
                f: (m.d * m.c - m.a * m.f) / det,
            };
        };

        const multiplyAffine = (
            m1: { a: number; b: number; c: number; d: number; e: number; f: number },
            m2: { a: number; b: number; c: number; d: number; e: number; f: number },
        ) => ({
            a: m1.a * m2.a + m1.b * m2.d,
            b: m1.a * m2.b + m1.b * m2.e,
            c: m1.a * m2.c + m1.b * m2.f + m1.c,
            d: m1.d * m2.a + m1.e * m2.d,
            e: m1.d * m2.b + m1.e * m2.e,
            f: m1.d * m2.c + m1.e * m2.f + m1.f,
        });

        const computeTransform = (src: [Point, Point, Point], dst: [Point, Point, Point]) => {
            const srcMatrix = buildAffine(src[0], src[1], src[2]);
            const dstMatrix = buildAffine(dst[0], dst[1], dst[2]);
            const invSrc = invertAffine(srcMatrix);
            if (!invSrc) {
                return null;
            }
            return multiplyAffine(dstMatrix, invSrc);
        };

        const transform1 = computeTransform(srcTri1, dstTri1);
        const transform2 = computeTransform(srcTri2, dstTri2);

        if (!transform1 || !transform2) {
            console.warn('Failed to compute warp transform for image.', data.id);
        } else {
            const SVG_NS = 'http://www.w3.org/2000/svg';
            const group = document.createElementNS(SVG_NS, 'g');
            const defs = document.createElementNS(SVG_NS, 'defs');

            const createClipPath = (id: string, points: [Point, Point, Point]) => {
                const clip = document.createElementNS(SVG_NS, 'clipPath');
                clip.setAttribute('id', id);
                clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
                const polygon = document.createElementNS(SVG_NS, 'polygon');
                polygon.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
                clip.appendChild(polygon);
                return clip;
            };

            const clipId1 = `warp-${data.id}-t1`;
            const clipId2 = `warp-${data.id}-t2`;
            defs.appendChild(createClipPath(clipId1, dstTri1));
            defs.appendChild(createClipPath(clipId2, dstTri2));
            group.appendChild(defs);

            const createWarpedImage = (clipId: string, transform: { a: number; b: number; c: number; d: number; e: number; f: number }) => {
                const image = document.createElementNS(SVG_NS, 'image');
                image.setAttribute('href', imgData.src!);
                image.setAttribute('width', String(width));
                image.setAttribute('height', String(height));
                image.setAttribute('preserveAspectRatio', 'none');
                image.setAttribute('clip-path', `url(#${clipId})`);
                image.setAttribute('transform', `matrix(${transform.a} ${transform.d} ${transform.b} ${transform.e} ${transform.c} ${transform.f})`);
                return image;
            };

            group.appendChild(createWarpedImage(clipId1, transform1));
            group.appendChild(createWarpedImage(clipId2, transform2));

            if (imgData.opacity !== undefined && imgData.opacity < 1) {
                group.setAttribute('opacity', String(imgData.opacity));
            }

            return group;
        }
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