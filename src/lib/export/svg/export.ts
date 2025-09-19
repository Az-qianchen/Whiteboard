/**
 * 本文件负责处理 SVG 导出逻辑。
 * 它使用 `roughjs` 库将内部路径数据转换为 SVG 字符串，并可选择使用 SVGO 进行优化。
 */
import type { AnyPath, BBox, FrameData, GroupData, ImageData } from '@/types';
import rough from 'roughjs/bin/rough';
import { getPathsBoundingBox } from '@/lib/drawing';
import { renderPathNode } from '../core/render';
import { getImageDataUrl } from '@/lib/imageCache';

/**
 * 递归地查找并返回路径树中所有的画框对象。
 * @param paths - 要搜索的路径数组。
 * @returns 一个包含所有找到的画框对象的数组。
 */
const getAllFrames = (paths: AnyPath[]): AnyPath[] => {
  let allFrames: AnyPath[] = [];
  for (const path of paths) {
    if (path.tool === 'frame') {
      allFrames.push(path);
    } else if (path.tool === 'group') {
      allFrames = [...allFrames, ...getAllFrames((path as GroupData).children)];
    }
  }
  return allFrames;
};

/**
 * Creates an SVG string from an array of path data, with an option to optimize it using SVGO.
 * @param paths - The array of paths to include in the SVG.
 * @param options - Optional configuration for padding and dimension handling.
 * @returns An optimized SVG string, or null if no paths are provided.
 */
export async function pathsToSvgString(paths: AnyPath[], options?: { 
  padding?: number; 
  keepDimensions?: boolean; 
  optimize?: boolean; 
  width?: number;
  height?: number;
  overrideBbox?: BBox;
  clipFrame?: FrameData;
}): Promise<string | null> {
  const clipFrame = options?.clipFrame;
  if (paths.length === 0 && !clipFrame && !options?.overrideBbox) return null;

  const padding = options?.padding ?? 20;
  const keepDimensions = options?.keepDimensions ?? false;
  const shouldOptimize = options?.optimize ?? true;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('xmlns', svgNS);

  let finalWidth: number, finalHeight: number;
  const mainGroup = document.createElementNS(svgNS, 'g');

  if (clipFrame) {
    const viewBoxWidth = clipFrame.width;
    const viewBoxHeight = clipFrame.height;
    
    finalWidth = options?.width ?? viewBoxWidth;
    finalHeight = options?.height ?? viewBoxHeight;
    svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
    
    const cx = clipFrame.x + clipFrame.width / 2;
    const cy = clipFrame.y + clipFrame.height / 2;
    const angleDegrees = (clipFrame.rotation ?? 0) * (180 / Math.PI);
    
    // Apply an inverse transform to "de-rotate" the content within the frame's boundaries.
    // The sequence is:
    // 1. Translate the whole scene so the frame's center is at the origin.
    // 2. Rotate the scene by the negative angle of the frame.
    // 3. Translate the scene again so the de-rotated frame's top-left corner is at (0,0).
    // SVG transforms are applied from right to left.
    mainGroup.setAttribute('transform', `translate(${clipFrame.width / 2} ${clipFrame.height / 2}) rotate(${-angleDegrees}) translate(${-cx} ${-cy})`);
  } else {
    const bbox = options?.overrideBbox || getPathsBoundingBox(paths, true);
    if (!bbox) return null;
    const viewBoxWidth = bbox.width + padding * 2;
    const viewBoxHeight = bbox.height + padding * 2;
    finalWidth = options?.width ?? viewBoxWidth;
    finalHeight = options?.height ?? viewBoxHeight;
    svg.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${viewBoxWidth} ${viewBoxHeight}`);
  }

  svg.setAttribute('width', String(finalWidth));
  svg.setAttribute('height', String(finalHeight));

  const rc = rough.svg(svg);

  const preparedPaths = await Promise.all(paths.map(enrichImagePath));
  const frames = getAllFrames(preparedPaths);

  preparedPaths.forEach(pathData => {
    const node = renderPathNode(rc, pathData);
    if (node) {
      mainGroup.appendChild(node);
    }
  });

  // 添加画框编号
  frames.forEach((frame, index) => {
    const frameData = frame as FrameData;
    const g = document.createElementNS(svgNS, 'g');
    g.setAttribute('class', 'frame-label-group');

    const labelPadding = 8;
    const labelHeight = 24;
    const number = index + 1;
    const textContent = String(number);
    const textPadding = 8;
    const textWidth = (textContent.length * 8) + (2 * textPadding);
    const labelWidth = textWidth;

    const labelText = document.createElementNS(svgNS, 'text');
    labelText.setAttribute('x', String(frameData.x + labelPadding + labelWidth / 2));
    labelText.setAttribute('y', String(frameData.y + labelPadding + labelHeight / 2));
    labelText.setAttribute('fill', frameData.color);
    labelText.setAttribute('stroke', '#FFFFFF'); // White stroke for visibility on various backgrounds
    labelText.setAttribute('stroke-width', '3');
    labelText.setAttribute('stroke-linejoin', 'round');
    labelText.setAttribute('paint-order', 'stroke');
    labelText.setAttribute('font-size', '14');
    labelText.setAttribute('font-weight', 'bold');
    labelText.setAttribute('font-family', 'sans-serif');
    labelText.setAttribute('text-anchor', 'middle');
    labelText.setAttribute('dominant-baseline', 'central');
    labelText.textContent = textContent;
    
    g.appendChild(labelText);
    
    if (frameData.rotation) {
        const cx = frameData.x + frameData.width / 2;
        const cy = frameData.y + frameData.height / 2;
        const angleDegrees = frameData.rotation * (180 / Math.PI);
        g.setAttribute('transform', `rotate(${angleDegrees} ${cx} ${cy})`);
    }
    
    mainGroup.appendChild(g);
  });

  svg.appendChild(mainGroup);
  
  const rawSvgString = new XMLSerializer().serializeToString(svg);

  if (!shouldOptimize) {
    return rawSvgString;
  }

  // SVGO browser bundle is not available by default in this project setup.
  // To keep builds working, skip optimization and return the raw SVG string.
  // If needed later, reintroduce SVGO via a browser-compatible build and dynamic import.
  return rawSvgString;
}
const enrichImagePath = async (path: AnyPath): Promise<AnyPath> => {
  if (path.tool === 'image') {
    const image = path as ImageData;
    if (image.src) return image;
    const src = await getImageDataUrl(image);
    return { ...image, src };
  }
  if (path.tool === 'group') {
    const group = path as GroupData;
    const children = await Promise.all(group.children.map(enrichImagePath));
    return { ...group, children };
  }
  return path;
};
