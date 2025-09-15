/**
 * 本文件提供用于为 SVG 元素创建效果滤镜的辅助函数。
 */
import type { AnyPath } from '@/types';

/**
 * 根据路径数据创建 SVG 滤镜元素。
 * @param data - 包含效果属性的路径数据。
 * @returns 如果需要效果，则返回一个 SVGFilterElement；否则返回 null。
 */
export function createEffectsFilter(data: AnyPath): SVGFilterElement | null {
  const hasBlur = (data.blur ?? 0) > 0;
  const hasShadow = data.shadowEnabled === true;

  if (!hasBlur && !hasShadow) {
    return null;
  }

  const svgNS = 'http://www.w3.org/2000/svg';
  const filterId = `effects-${data.id}`;

  const filter = document.createElementNS(svgNS, 'filter');
  filter.setAttribute('id', filterId);
  filter.setAttribute('x', '-50%');
  filter.setAttribute('y', '-50%');
  filter.setAttribute('width', '200%');
  filter.setAttribute('height', '200%');

  // 当模糊和阴影同时存在时，需要手动构建阴影效果
  // 以便在合并最终结果之前可以独立地模糊源图形。
  if (hasShadow && hasBlur) {
    // 1. 创建阴影
    const shadowBlur = document.createElementNS(svgNS, 'feGaussianBlur');
    shadowBlur.setAttribute('in', 'SourceAlpha');
    shadowBlur.setAttribute('stdDeviation', String(data.shadowBlur ?? 2));
    shadowBlur.setAttribute('result', 'shadowBlur');

    const shadowOffset = document.createElementNS(svgNS, 'feOffset');
    shadowOffset.setAttribute('in', 'shadowBlur');
    shadowOffset.setAttribute('dx', String(data.shadowOffsetX ?? 2));
    shadowOffset.setAttribute('dy', String(data.shadowOffsetY ?? 2));
    shadowOffset.setAttribute('result', 'shadowOffset');

    const flood = document.createElementNS(svgNS, 'feFlood');
    flood.setAttribute('flood-color', data.shadowColor ?? 'rgba(0,0,0,0.5)');
    flood.setAttribute('result', 'shadowColor');

    const composite = document.createElementNS(svgNS, 'feComposite');
    composite.setAttribute('in', 'shadowColor');
    composite.setAttribute('in2', 'shadowOffset');
    composite.setAttribute('operator', 'in');
    composite.setAttribute('result', 'shadow');

    // 2. 模糊原始图形
    const mainBlur = document.createElementNS(svgNS, 'feGaussianBlur');
    mainBlur.setAttribute('in', 'SourceGraphic');
    mainBlur.setAttribute('stdDeviation', String(data.blur ?? 0));
    mainBlur.setAttribute('result', 'mainBlur');

    // 3. 合并阴影和模糊后的图形
    const merge = document.createElementNS(svgNS, 'feMerge');
    const mergeNode1 = document.createElementNS(svgNS, 'feMergeNode');
    mergeNode1.setAttribute('in', 'shadow');
    const mergeNode2 = document.createElementNS(svgNS, 'feMergeNode');
    mergeNode2.setAttribute('in', 'mainBlur');

    merge.appendChild(mergeNode1);
    merge.appendChild(mergeNode2);

    filter.appendChild(shadowBlur);
    filter.appendChild(shadowOffset);
    filter.appendChild(flood);
    filter.appendChild(composite);
    filter.appendChild(mainBlur);
    filter.appendChild(merge);

  } else if (hasShadow) {
    // 如果只有阴影，使用更简单的 feDropShadow
    const shadow = document.createElementNS(svgNS, 'feDropShadow');
    shadow.setAttribute('dx', String(data.shadowOffsetX ?? 2));
    shadow.setAttribute('dy', String(data.shadowOffsetY ?? 2));
    shadow.setAttribute('stdDeviation', String(data.shadowBlur ?? 2));
    shadow.setAttribute('flood-color', data.shadowColor ?? 'rgba(0,0,0,0.5)');
    filter.appendChild(shadow);

  } else if (hasBlur) {
    // 如果只有模糊
    const blur = document.createElementNS(svgNS, 'feGaussianBlur');
    blur.setAttribute('stdDeviation', String(data.blur ?? 0));
    filter.appendChild(blur);
  }

  return filter;
}