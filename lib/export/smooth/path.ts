import type { AnyPath, VectorPathData, RectangleData, EllipseData, EndpointStyle, BrushPathData, PolygonData, ArcData } from '../../types';
import { anchorsToPathD, pointsToPathD } from '../../path-fitting';
import { createSvgMarker } from '../markers/svg';
import { getPolygonPathD, calculateArcPathD } from '../../drawing';

export function createSmoothPathNode(data: AnyPath): SVGElement | null {
    const svgNS = 'http://www.w3.org/2000/svg';
    let d = '';

    switch (data.tool) {
        case 'brush': {
            const pathData = data as BrushPathData;
            if (pathData.points && pathData.points.length > 0) {
                d = pointsToPathD(pathData.points);
            }
            break;
        }
        case 'pen':
        case 'line': {
            const pathData = data as VectorPathData;
            if (pathData.anchors && pathData.anchors.length > 0) {
                d = anchorsToPathD(pathData.anchors, !!pathData.isClosed);
            }
            break;
        }
        case 'rectangle': {
            const { x, y, width, height, borderRadius } = data as RectangleData;
            const r = Math.min(borderRadius ?? 0, width / 2, height / 2);
            d = `M${x + r},${y} h${width - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${height - 2 * r} a${r},${r} 0 0 1 ${-r},${r} h${-(width - 2 * r)} a${r},${r} 0 0 1 ${-r},${-r} v${-(height - 2 * r)} a${r},${r} 0 0 1 ${r},${-r}z`;
            break;
        }
        case 'polygon': {
            const { x, y, width, height, sides, borderRadius } = data as PolygonData;
            d = getPolygonPathD(x, y, width, height, sides, borderRadius);
            break;
        }
        case 'ellipse': {
            const { x, y, width, height } = data as EllipseData;
            const rx = width / 2;
            const ry = height / 2;
            const cx = x + rx;
            const cy = y + ry;
            d = `M${cx - rx},${cy} A${rx},${ry} 0 1 0 ${cx + rx},${cy} A${rx},${ry} 0 1 0 ${cx - rx},${cy}Z`;
            break;
        }
        case 'arc': {
            const arcData = data as ArcData;
            const calculatedD = calculateArcPathD(arcData.points[0], arcData.points[1], arcData.points[2]);
            if (calculatedD) {
                d = calculatedD;
            }
            break;
        }
    }

    if (!d) return null;

    const g = document.createElementNS(svgNS, 'g');
    const defs = document.createElementNS(svgNS, 'defs');
    g.appendChild(defs);

    const pathEl = document.createElementNS(svgNS, 'path');
    pathEl.setAttribute('d', d);
    pathEl.setAttribute('stroke', data.color);
    pathEl.setAttribute('stroke-width', String(data.strokeWidth));
    pathEl.setAttribute('fill', (data.fill && data.fill !== 'transparent') ? data.fill : 'none');
    
    if (data.strokeLineDash) {
        pathEl.setAttribute('stroke-dasharray', data.strokeLineDash.join(' '));
    }
    
    if (data.strokeLineJoin) {
        pathEl.setAttribute('stroke-linejoin', data.strokeLineJoin);
    }

    const isVectorPath = data.tool === 'pen' || data.tool === 'line';
    if (isVectorPath) {
        const pathData = data as VectorPathData;
        if (!pathData.isClosed) {
            const toSvgCap = (cap?: EndpointStyle) => (cap === 'square_cap' ? 'square' : cap === 'round' ? 'round' : 'butt');
            const startCap = data.strokeLineCapStart ?? 'butt';
            const endCap = data.strokeLineCapEnd ?? 'butt';
            const nativeCaps = ['butt', 'round', 'square_cap'];
            const isStartNative = nativeCaps.includes(startCap);
            const isEndNative = nativeCaps.includes(endCap);
            
            let linecapToSet: 'butt' | 'round' | 'square' = 'butt';
            let useStartMarker = !isStartNative;
            let useEndMarker = !isEndNative;
            
            if (isStartNative && isEndNative) {
                if (startCap === endCap) {
                    linecapToSet = toSvgCap(startCap);
                } else {
                    useStartMarker = true; // Mismatched native caps, use markers for both
                    useEndMarker = true;
                }
            } else if (isStartNative) {
                linecapToSet = toSvgCap(startCap);
            } else if (isEndNative) {
                linecapToSet = toSvgCap(endCap);
            }
            pathEl.setAttribute('stroke-linecap', linecapToSet);

            if (useStartMarker) {
                const markerId = `marker-start-${data.id}`;
                const marker = createSvgMarker(markerId, startCap, data.color, data.endpointSize ?? 1, data.endpointFill ?? 'hollow', true);
                if (marker) { defs.appendChild(marker); pathEl.setAttribute('marker-start', `url(#${markerId})`); }
            }

            if (useEndMarker) {
                const markerId = `marker-end-${data.id}`;
                const marker = createSvgMarker(markerId, endCap, data.color, data.endpointSize ?? 1, data.endpointFill ?? 'hollow', false);
                if (marker) { defs.appendChild(marker); pathEl.setAttribute('marker-end', `url(#${markerId})`); }
            }
        }
    }

    g.appendChild(pathEl);
    const hasRotation = data.rotation && (data.tool === 'rectangle' || data.tool === 'ellipse' || data.tool === 'polygon');
    
    if (!defs.hasChildNodes() && !hasRotation) {
        if (data.opacity !== undefined && data.opacity < 1) {
            pathEl.setAttribute('opacity', String(data.opacity));
        }
        return pathEl;
    } else {
        if (hasRotation) {
            const { x, y, width, height, rotation } = data as RectangleData | EllipseData | PolygonData;
            const cx = x + width / 2;
            const cy = y + height / 2;
            const angleDegrees = rotation * (180 / Math.PI);
            g.setAttribute('transform', `rotate(${angleDegrees} ${cx} ${cy})`);
        }
        if (data.opacity !== undefined && data.opacity < 1) {
            g.setAttribute('opacity', String(data.opacity));
        }
        if (!defs.hasChildNodes()) {
            g.removeChild(defs);
        }
        return g;
    }
}