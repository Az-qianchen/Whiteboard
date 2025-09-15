/**
 * 本文件提供用于为 SVG 元素创建效果滤镜的辅助函数。
 */
import type { RoughSVG } from 'roughjs/bin/svg';
import type { AnyPath, VectorPathData, RectangleData, EllipseData, ImageData, BrushPathData, PolygonData, ArcData, GroupData, TextData, FrameData } from '@/types';
import { createSmoothPathNode } from '../smooth/path';
import { renderRoughVectorPath } from '../rough/path';
import { renderImage, renderRoughShape } from '../rough/shapes';
import { sampleArc } from '@/lib/drawing/arc';
import { createEffectsFilter } from './effects';

/**
 * 将 TextData 对象渲染为 SVG <g> 元素，其中包含一个 <text> 元素。
 * @param data - 要渲染的文本数据对象。
 * @returns 包含渲染后文本的 SVG <g> 元素。
 */
function renderText(data: TextData): SVGElement {
    const svgNS = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(svgNS, 'g');
    const textEl = document.createElementNS(svgNS, 'text');

    const fontFamily = data.fontFamily || 'Excalifont';
    // 当字体名称包含空格时，应将其用引号括起来以确保 CSS 正确解析。
    const familyWithQuotes = fontFamily.includes(' ') ? `'${fontFamily}'` : fontFamily;

    textEl.setAttribute('font-size', `${data.fontSize}px`);
    textEl.style.fontFamily = familyWithQuotes;
    textEl.setAttribute('fill', data.color);
    textEl.style.whiteSpace = 'pre'; // 尊重空格

    // 垂直对齐：将 y 设置为边界框的顶部
    textEl.setAttribute('y', String(data.y));

    // 水平对齐
    let x = data.x;
    if (data.textAlign === 'center') {
        x += data.width / 2;
        textEl.setAttribute('text-anchor', 'middle');
    } else if (data.textAlign === 'right') {
        x += data.width;
        textEl.setAttribute('text-anchor', 'end');
    }
    textEl.setAttribute('x', String(x));

    const lines = data.text.split('\n');
    const lineHeight = data.fontSize * 1.25;

    lines.forEach((line, index) => {
        const tspan = document.createElementNS(svgNS, 'tspan');
        tspan.textContent = line;
        tspan.setAttribute('x', String(x));
        // 使用 dy 实现换行。第一行需要特殊处理以进行垂直对齐。
        const dy = index === 0 ? `${data.fontSize * 0.8}px` : `${lineHeight}px`; // 0.8 是基线的经验值
        tspan.setAttribute('dy', dy);
        textEl.appendChild(tspan);
    });

    g.appendChild(textEl);
    return g;
}


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

    if (data.tool === 'text') {
        node = renderText(data as TextData);
    } else {
        const isRough = data.isRough ?? true;
        if (!isRough && data.tool !== 'image') {
            return createSmoothPathNode(data);
        }

        if (data.tool === 'image') {
            node = renderImage(data as ImageData);
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
    const finalElement = needsWrapper ? document.createElementNS('http://www.w3.org/2000/svg', 'g') : node;

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
    
    if (data.opacity !== undefined && data.opacity < 1) {
        finalElement.setAttribute('opacity', String(data.opacity));
    }
    
    if ((data.tool === 'rectangle' || data.tool === 'ellipse' || data.tool === 'image' || data.tool === 'polygon' || data.tool === 'text' || data.tool === 'frame')) {
        const { x, y, width, height } = data;
        const cx = x + width / 2;
        const cy = y + height / 2;
        const scaleX = data.scaleX ?? 1;
        const scaleY = data.scaleY ?? 1;
        if (data.rotation || scaleX !== 1 || scaleY !== 1) {
            const angleDegrees = (data.rotation || 0) * (180 / Math.PI);
            const transforms: string[] = [`translate(${cx} ${cy})`];
            if (data.rotation) {
                transforms.push(`rotate(${angleDegrees})`);
            }
            if (scaleX !== 1 || scaleY !== 1) {
                transforms.push(`scale(${scaleX} ${scaleY})`);
            }
            transforms.push(`translate(${-cx} ${-cy})`);
            finalElement.setAttribute('transform', transforms.join(' '));
        }
    }

    return finalElement;
}
