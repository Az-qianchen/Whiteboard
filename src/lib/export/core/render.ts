/**
 * 本文件提供用于为 SVG 元素创建效果滤镜的辅助函数。
 */
import type { RoughSVG } from 'roughjs/bin/svg';
import type { AnyPath, VectorPathData, RectangleData, EllipseData, ImageData, BrushPathData, PolygonData, ArcData, GroupData, FrameData, GradientFill, TextData } from '@/types';
import { createSmoothPathNode } from '../smooth/path';
import { renderRoughVectorPath } from '../rough/path';
import { renderImage, renderRoughShape } from '../rough/shapes';
import { sampleArc } from '@/lib/drawing/arc';
import { createEffectsFilter } from './effects';
import { getShapeTransformMatrix, isIdentityMatrix, matrixToString } from '@/lib/drawing/transform/matrix';
import { getLinearGradientCoordinates, getRadialGradientAttributes, gradientStopColor } from '@/lib/gradient';
import { parseColor, hslaToHslaString } from '@/lib/color';

const SVG_NS = 'http://www.w3.org/2000/svg';

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const ensureDefs = (element: SVGElement): SVGDefsElement => {
    const existing = element.querySelector('defs');
    if (existing) return existing as SVGDefsElement;
    const defs = document.createElementNS(SVG_NS, 'defs');
    element.insertBefore(defs, element.firstChild);
    return defs;
};

const applyGradientFill = (finalElement: SVGElement, shapeNode: SVGElement, gradient: GradientFill, shapeId: string): SVGElement => {
    let container = finalElement;
    if (container.tagName !== 'g') {
        const wrapper = document.createElementNS(SVG_NS, 'g');
        wrapper.appendChild(container);
        container = wrapper;
    }

    const defs = ensureDefs(container);
    const gradientId = `gradient-${shapeId}`;
    const existingGradient = defs.querySelector(`#${gradientId}`);
    if (existingGradient) defs.removeChild(existingGradient);

    const gradientElement = gradient.type === 'linear'
      ? document.createElementNS(SVG_NS, 'linearGradient')
      : document.createElementNS(SVG_NS, 'radialGradient');

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
        const stopElement = document.createElementNS(SVG_NS, 'stop');
        const offset = clamp(stop.offset ?? 0, 0, 1);
        stopElement.setAttribute('offset', `${Math.round(offset * 100)}%`);
        const parsed = parseColor(gradientStopColor(gradient, index));
        const baseColor = hslaToHslaString({ ...parsed, a: 1 });
        stopElement.setAttribute('stop-color', baseColor);
        const alpha = clamp(stop.opacity ?? parsed.a, 0, 1);
        if (alpha < 1) {
            stopElement.setAttribute('stop-opacity', alpha.toString());
        }
        gradientElement.appendChild(stopElement);
    });

    defs.appendChild(gradientElement);

    const applyFillRecursive = (element: SVGElement) => {
        if (element.tagName === 'defs') return;
        const fillAttr = element.getAttribute('fill');
        if (!fillAttr || (fillAttr !== 'none' && fillAttr !== 'transparent')) {
            element.setAttribute('fill', `url(#${gradientId})`);
        }
        element.childNodes.forEach(child => {
            if (child instanceof SVGElement) applyFillRecursive(child);
        });
    };
    applyFillRecursive(shapeNode);

    return container;
};

/**
 * 使用给定的 RoughJS 实例将 AnyPath 对象渲染为 SVGElement。
 * 这是主画板和导出函数共享的实用工具。
 * @param rc - 用于渲染的 RoughSVG 实例。
 * @param data - 要渲染的路径数据对象。
 * @returns 表示已渲染路径的 SVGElement（例如 <path>、<g>），或为 null。
 */
export function renderPathNode(rc: RoughSVG, data: AnyPath): SVGElement | null {
    let node: SVGElement | null = null;
    const capNodes: SVGElement[] = [];

        const isRough = data.isRough ?? true;
        if (!isRough && data.tool !== 'image') {
            return createSmoothPathNode(data);
        }

        if (data.tool === 'image') {
            node = renderImage(data as ImageData);
        } else if (data.tool === 'text') {
            const textData = data as TextData;
            const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            const anchor = (() => {
                switch (textData.textAlign) {
                    case 'center':
                        return { anchor: 'middle', x: textData.x + textData.width / 2 } as const;
                    case 'right':
                        return { anchor: 'end', x: textData.x + textData.width } as const;
                    default:
                        return { anchor: 'start', x: textData.x } as const;
                }
            })();
            textNode.setAttribute('x', anchor.x.toString());
            textNode.setAttribute('y', textData.y.toString());
            textNode.setAttribute('text-anchor', anchor.anchor);
            textNode.setAttribute('dominant-baseline', 'text-before-edge');
            textNode.setAttribute('font-family', textData.fontFamily);
            textNode.setAttribute('font-size', textData.fontSize.toString());
            textNode.setAttribute('fill', textData.color ?? '#ffffff');
            const lineHeight = (textData.lineHeight ?? 1.25) * textData.fontSize;
            const lines = textData.text.replace(/\r\n?/g, '\n').split('\n');
            lines.forEach((line, index) => {
                const tspan = document.createElementNS(SVG_NS, 'tspan');
                tspan.setAttribute('x', anchor.x.toString());
                if (index === 0) {
                    tspan.setAttribute('dy', '0');
                } else {
                    tspan.setAttribute('dy', lineHeight.toString());
                }
                tspan.textContent = line || ' ';
                textNode.appendChild(tspan);
            });
            node = textNode;
        } else if (data.tool === 'group') {
            const groupData = data as GroupData;
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

            if (groupData.mask === 'clip' && groupData.children.length > 1) {
                const clipId = `clip-${groupData.id}`;
                const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
                clipPath.setAttribute('id', clipId);

                const maskShape = groupData.children[groupData.children.length - 1];
                
                // 为可靠的剪裁创建一个干净、非手绘、实心填充的遮罩形状版本。
                // 在 clipPath 内部会忽略样式和手绘效果，
                // 但这能确保我们生成一个简单的单一几何元素。
                const clipShape = {
                    ...maskShape,
                    color: 'transparent', // 无描边
                    fill: '#000',          // 实心填充
                    fillStyle: 'solid',
                    isRough: false,        // 非手绘
                    // 重置效果
                    blur: 0,
                    shadowEnabled: false,
                };

                const maskNode = renderPathNode(rc, clipShape);

                if (maskNode) {
                    clipPath.appendChild(maskNode);
                }
                defs.appendChild(clipPath);
                group.appendChild(defs);

                const contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                contentGroup.setAttribute('clip-path', `url(#${clipId})`);

                groupData.children.slice(0, -1).forEach(child => {
                    const childNode = renderPathNode(rc, child);
                    if (childNode) {
                        contentGroup.appendChild(childNode);
                    }
                });
                group.appendChild(contentGroup);

                // 现在，渲染原始遮罩形状本身，使其可见。
                const visibleMaskNode = renderPathNode(rc, maskShape);
                if (visibleMaskNode) {
                    group.appendChild(visibleMaskNode);
                }
            } else {
                groupData.children.forEach(child => {
                    const childNode = renderPathNode(rc, child);
                    if (childNode) {
                        group.appendChild(childNode);
                    }
                });
            }
            node = group;
        } else {
            const seed = parseInt(data.id, 10);
            
            const options: any = {
              stroke: data.color,
              strokeWidth: data.strokeWidth,
              roughness: data.roughness,
              bowing: data.bowing,
              seed: isNaN(seed) ? 1 : seed,
              preserveVertices: data.preserveVertices,
              disableMultiStroke: data.disableMultiStroke,
              disableMultiStrokeFill: data.disableMultiStrokeFill,
            };

            const isDashed = data.strokeLineDash && data.strokeLineDash[0] > 0 && data.strokeLineDash[1] > 0;
            if (isDashed) {
                options.strokeLineDash = data.strokeLineDash;
            }
        
            if (data.fill && data.fill !== 'transparent') {
                options.fill = data.fill;
                options.fillStyle = data.fillStyle || 'hachure';
                if (data.fillWeight != null && data.fillWeight >= 0) options.fillWeight = data.fillWeight;
                if (data.hachureGap != null && data.hachureGap >= 0) options.hachureGap = data.hachureGap;
                options.hachureAngle = data.hachureAngle;
            }

            if (data.tool === 'pen' || data.tool === 'line') {
                const result = renderRoughVectorPath(rc, data as VectorPathData, options);
                node = result.node;
                capNodes.push(...result.capNodes);
            } else if (data.tool === 'brush') {
                const brushData = data as BrushPathData;
                const points = brushData.points.map(p => [p.x, p.y] as [number, number]);
                if (points.length > 0) {
                    options.curveTightness = data.curveTightness;
                    options.curveStepCount = data.curveStepCount;
                    node = rc.curve(points, options);
                }
            } else if (data.tool === 'arc') {
                const arcData = data as ArcData;
                const points = sampleArc(arcData.points[0], arcData.points[1], arcData.points[2], 50).map(p => [p.x, p.y] as [number, number]);
                if (points.length > 0) {
                    options.curveStepCount = 1; // Don't double-smooth
                    options.curveTightness = 0;
                    node = rc.curve(points, options);
                }
            } else if (data.tool === 'ellipse' || data.tool === 'rectangle' || data.tool === 'polygon' || data.tool === 'frame') {
                node = renderRoughShape(rc, data as RectangleData | EllipseData | PolygonData | FrameData, options);
            }
        }
    
    if (!node) return null;

    const pathIsVector = data.tool === 'pen' || data.tool === 'line';
    
    if (!pathIsVector) {
        const applyStyles = (el: SVGElement) => {
            if (el.tagName === 'path') {
                const joinStyle = data.strokeLineJoin ?? 'round';
                el.setAttribute('stroke-linejoin', joinStyle);
                el.setAttribute('stroke-linecap', 'round');
            }
            if (el.childNodes) {
                el.childNodes.forEach(child => applyStyles(child as SVGElement));
            }
        };
        applyStyles(node);
    }

    const hasEffects = (data.blur ?? 0) > 0 || data.shadowEnabled === true;
    const needsWrapper = capNodes.length > 0 || hasEffects;
    let finalElement = needsWrapper ? document.createElementNS('http://www.w3.org/2000/svg', 'g') : node;

    if (needsWrapper) {
        const g = finalElement as SVGGElement;

        if (hasEffects) {
            const filter = createEffectsFilter(data);
            if (filter) {
                const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                defs.appendChild(filter);
                g.appendChild(defs);
                node.setAttribute('filter', `url(#${filter.id})`);
                capNodes.forEach(cap => cap.setAttribute('filter', `url(#${filter.id})`));
            }
        }
        
        g.appendChild(node);
        capNodes.forEach(cap => g.appendChild(cap));
    }

    if (data.fillGradient && data.fillGradient.stops && data.fillGradient.stops.length > 0) {
        finalElement = applyGradientFill(finalElement, node, data.fillGradient, data.id);
    }

    if (data.opacity !== undefined && data.opacity < 1) {
        finalElement.setAttribute('opacity', String(data.opacity));
    }
    
    if ((data.tool === 'rectangle' || data.tool === 'ellipse' || data.tool === 'image' || data.tool === 'polygon' || data.tool === 'frame' || data.tool === 'text')) {
        const matrix = getShapeTransformMatrix(data as RectangleData | EllipseData | ImageData | PolygonData | FrameData | TextData);
        if (!isIdentityMatrix(matrix)) {
            finalElement.setAttribute('transform', matrixToString(matrix));
        }
    }

    return finalElement;
}
