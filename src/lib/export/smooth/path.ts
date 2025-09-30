/**
 * 本文件定义了用于创建平滑（非手绘风格）SVG 路径节点的函数。
 * 主要用于导出 SVG，以确保输出的 SVG 代码简洁且符合标准。
 */
import type { AnyPath, VectorPathData, RectangleData, EllipseData, EndpointStyle, BrushPathData, PolygonData, ArcData, FrameData, GradientFill, TextData } from '@/types';
import { anchorsToPathD, pointsToPathD } from '@/lib/path-fitting';
import { createSvgMarker } from '../markers/svg';
import { getPolygonPathD, calculateArcPathD } from '@/lib/drawing';
import { createEffectsFilter } from '../core/effects';
import { getLinearGradientCoordinates, getRadialGradientAttributes, gradientStopColor } from '@/lib/gradient';
import { parseColor, hslaToHslaString } from '@/lib/color';

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

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
        case 'frame': {
            const { x, y, width, height } = data as FrameData;
            d = `M${x},${y} h${width} v${height} h${-width}z`;
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
        case 'text': {
            const textData = data as TextData;
            const textEl = document.createElementNS(svgNS, 'text');
            const lineHeightPx = textData.fontSize * textData.lineHeight;
            const baseX = textData.textAlign === 'center'
                ? textData.x + textData.width / 2
                : textData.textAlign === 'right'
                  ? textData.x + textData.width - textData.paddingX
                  : textData.x + textData.paddingX;
            const baseY = textData.y + textData.paddingY;

            textEl.setAttribute('x', baseX.toString());
            textEl.setAttribute('y', baseY.toString());
            textEl.setAttribute('fill', textData.color);
            textEl.setAttribute('stroke', 'none');
            textEl.setAttribute('font-size', `${textData.fontSize}`);
            textEl.setAttribute('font-family', textData.fontFamily);
            textEl.setAttribute('text-anchor', textData.textAlign === 'center' ? 'middle' : textData.textAlign === 'right' ? 'end' : 'start');
            textEl.setAttribute('dominant-baseline', 'hanging');
            textEl.setAttribute('xml:space', 'preserve');

            const lines = textData.text.split(/\r?\n/);
            lines.forEach((line, index) => {
                const tspan = document.createElementNS(svgNS, 'tspan');
                if (index > 0) {
                    tspan.setAttribute('x', baseX.toString());
                    tspan.setAttribute('dy', lineHeightPx.toString());
                }
                tspan.textContent = line.length > 0 ? line : '\u200B';
                textEl.appendChild(tspan);
            });

            if (data.opacity !== undefined && data.opacity < 1) {
                textEl.setAttribute('opacity', String(data.opacity));
            }

            if (data.fillGradient && data.fillGradient.stops && data.fillGradient.stops.length > 0) {
                const gradient = data.fillGradient as GradientFill;
                const defs = document.createElementNS(svgNS, 'defs');
                const gradientId = `gradient-${data.id}`;
                const gradientElement = gradient.type === 'linear'
                    ? document.createElementNS(svgNS, 'linearGradient')
                    : document.createElementNS(svgNS, 'radialGradient');
                gradientElement.setAttribute('id', gradientId);

                if (gradient.type === 'linear') {
                    const { x1, y1, x2, y2 } = getLinearGradientCoordinates(gradient);
                    gradientElement.setAttribute('x1', x1.toString());
                    gradientElement.setAttribute('y1', y1.toString());
                    gradientElement.setAttribute('x2', x2.toString());
                    gradientElement.setAttribute('y2', y2.toString());
                } else {
                    const { cx, cy, fx, fy, r } = getRadialGradientAttributes(gradient);
                    gradientElement.setAttribute('cx', cx.toString());
                    gradientElement.setAttribute('cy', cy.toString());
                    gradientElement.setAttribute('fx', fx.toString());
                    gradientElement.setAttribute('fy', fy.toString());
                    gradientElement.setAttribute('r', r.toString());
                }

                gradient.stops.forEach((stop, index) => {
                    const stopEl = document.createElementNS(svgNS, 'stop');
                    const offset = clamp(stop.offset ?? 0, 0, 1);
                    stopEl.setAttribute('offset', `${Math.round(offset * 100)}%`);
                    const parsed = parseColor(gradientStopColor(gradient, index));
                    const baseColor = hslaToHslaString({ ...parsed, a: 1 });
                    stopEl.setAttribute('stop-color', baseColor);
                    const alpha = clamp(stop.opacity ?? parsed.a, 0, 1);
                    if (alpha < 1) {
                        stopEl.setAttribute('stop-opacity', alpha.toString());
                    }
                    gradientElement.appendChild(stopEl);
                });

                defs.appendChild(gradientElement);
                const container = document.createElementNS(svgNS, 'g');
                container.appendChild(defs);
                textEl.setAttribute('fill', `url(#${gradientId})`);
                container.appendChild(textEl);
                return container;
            }

            textEl.setAttribute('fill', textData.color);
            return textEl;
        }
    }

    if (!d) return null;

    const g = document.createElementNS(svgNS, 'g');
    const defs = document.createElementNS(svgNS, 'defs');
    g.appendChild(defs);

    const pathEl = document.createElementNS(svgNS, 'path');
    pathEl.setAttribute('d', d);

    if (data.tool === 'frame') {
      pathEl.setAttribute('stroke', data.color);
      pathEl.setAttribute('stroke-width', '2');
      pathEl.setAttribute('stroke-dasharray', '8 4');
      pathEl.setAttribute('fill', 'none');
    } else {
      pathEl.setAttribute('stroke', data.color);
      pathEl.setAttribute('stroke-width', String(data.strokeWidth));
      const defaultFill = (data.fill && data.fill !== 'transparent') ? data.fill : 'none';
      if (data.fillGradient && data.fillGradient.stops && data.fillGradient.stops.length > 0) {
        const gradient = data.fillGradient as GradientFill;
        const gradientId = `gradient-${data.id}`;
        const existing = defs.querySelector(`#${gradientId}`);
        if (existing) defs.removeChild(existing);
        const gradientElement = gradient.type === 'linear'
          ? document.createElementNS(svgNS, 'linearGradient')
          : document.createElementNS(svgNS, 'radialGradient');
        gradientElement.setAttribute('id', gradientId);

        if (gradient.type === 'linear') {
          const { x1, y1, x2, y2 } = getLinearGradientCoordinates(gradient);
          gradientElement.setAttribute('x1', x1.toString());
          gradientElement.setAttribute('y1', y1.toString());
          gradientElement.setAttribute('x2', x2.toString());
          gradientElement.setAttribute('y2', y2.toString());
        } else {
          const { cx, cy, fx, fy, r } = getRadialGradientAttributes(gradient);
          gradientElement.setAttribute('cx', cx.toString());
          gradientElement.setAttribute('cy', cy.toString());
          gradientElement.setAttribute('fx', fx.toString());
          gradientElement.setAttribute('fy', fy.toString());
          gradientElement.setAttribute('r', r.toString());
        }

        gradient.stops.forEach((stop, index) => {
          const stopEl = document.createElementNS(svgNS, 'stop');
          const offset = clamp(stop.offset ?? 0, 0, 1);
          stopEl.setAttribute('offset', `${Math.round(offset * 100)}%`);
          const parsed = parseColor(gradientStopColor(gradient, index));
          const baseColor = hslaToHslaString({ ...parsed, a: 1 });
          stopEl.setAttribute('stop-color', baseColor);
          const alpha = clamp(stop.opacity ?? parsed.a, 0, 1);
          if (alpha < 1) {
            stopEl.setAttribute('stop-opacity', alpha.toString());
          }
          gradientElement.appendChild(stopEl);
        });
        defs.appendChild(gradientElement);
        pathEl.setAttribute('fill', `url(#${gradientId})`);
      } else {
        pathEl.setAttribute('fill', defaultFill);
      }
    }
    
    if (data.strokeLineDash) {
        pathEl.setAttribute('stroke-dasharray', data.strokeLineDash.join(' '));
    }
    
    const joinStyle = data.strokeLineJoin ?? 'round';
    pathEl.setAttribute('stroke-linejoin', joinStyle);

    const canHaveEndpoints = ['pen', 'line', 'brush', 'arc'].includes(data.tool);
    const isClosedPath = (data.tool === 'pen' || data.tool === 'line') && (data as VectorPathData).isClosed;

    if (canHaveEndpoints && !isClosedPath) {
        const startCap = data.strokeLineCapStart ?? 'butt';
        const endCap = data.strokeLineCapEnd ?? 'butt';
        const nativeCaps = ['butt', 'round', 'square_cap'];
        const isStartNative = nativeCaps.includes(startCap);
        const isEndNative = nativeCaps.includes(endCap);
        
        if (isStartNative && isEndNative && startCap === endCap) {
            const svgCap = startCap === 'square_cap' ? 'square' : startCap;
            pathEl.setAttribute('stroke-linecap', svgCap);
        } else {
            pathEl.setAttribute('stroke-linecap', 'round');

            if (startCap !== 'butt') {
                const markerId = `marker-start-${data.id}`;
                const marker = createSvgMarker(markerId, startCap, data.color, data.endpointSize ?? 1, data.endpointFill ?? 'hollow', true);
                if (marker) { defs.appendChild(marker); pathEl.setAttribute('marker-start', `url(#${markerId})`); }
            }

            if (endCap !== 'butt') {
                const markerId = `marker-end-${data.id}`;
                const marker = createSvgMarker(markerId, endCap, data.color, data.endpointSize ?? 1, data.endpointFill ?? 'hollow', false);
                if (marker) { defs.appendChild(marker); pathEl.setAttribute('marker-end', `url(#${markerId})`); }
            }
        }
    }

    g.appendChild(pathEl);
    
    const hasEffects = (data.blur ?? 0) > 0 || data.shadowEnabled === true;
    if (hasEffects) {
        const filter = createEffectsFilter(data);
        if (filter) {
            defs.appendChild(filter);
            pathEl.setAttribute('filter', `url(#${filter.id})`);
        }
    }

    const hasRotation = data.rotation && (data.tool === 'rectangle' || data.tool === 'ellipse' || data.tool === 'polygon' || data.tool === 'frame');
    
    if (!defs.hasChildNodes() && !hasRotation) {
        if (data.opacity !== undefined && data.opacity < 1) {
            pathEl.setAttribute('opacity', String(data.opacity));
        }
        return pathEl;
    } else {
        if (hasRotation) {
            const { x, y, width, height, rotation } = data as RectangleData | EllipseData | PolygonData | FrameData;
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