/**
 * 本文件负责处理 SVG 导出逻辑。
 * 它使用 `roughjs` 库将内部路径数据转换为 SVG 字符串，并可选择使用 SVGO 进行优化。
 */
import type { AnyPath, BBox, FrameData } from '../../types';
import rough from 'roughjs/bin/rough';
import { getPathsBoundingBox } from '../../drawing';
import { renderPathNode } from '../core/render';

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

  paths.forEach(pathData => {
    const node = renderPathNode(rc, pathData);
    if (node) {
      mainGroup.appendChild(node);
    }
  });

  svg.appendChild(mainGroup);
  
  const rawSvgString = new XMLSerializer().serializeToString(svg);

  if (!shouldOptimize) {
    return rawSvgString;
  }

  try {
    const { optimize } = await import('svgo/dist/svgo.browser.js');

    // Manually list plugins to avoid the warning with `preset-default` overrides.
    // This is the default list from SVGO v3, with modifications.
    const defaultPlugins = [
      'cleanupAttrs', 'cleanupEnableBackground', 'cleanupIds', 'cleanupListOfValues', 
      'cleanupNumericValues', 'collapseGroups', 'convertColors', 'convertPathData', 
      'convertShapeToPath', 'convertStyleToAttrs', 'convertTransform', 'inlineStyles', 
      'mergePaths', 'minifyStyles', 'moveElemsAttrsToGroup', 'moveGroupAttrsToElems', 
      'removeComments', 'removeDesc', 'removeDimensions', 'removeDoctype', 
      'removeEditorsNSData', 'removeEmptyAttrs', 'removeEmptyContainers', 'removeEmptyText', 
      'removeHiddenElems', 'removeMetadata', 'removeNonInheritableGroupAttrs', 
      'removeRasterImages', 'removeScriptElement', 'removeStyleElement', 'removeTitle', 
      'removeUnknownsAndDefaults', 'removeUnusedNS', 'removeUselessDefs', 
      'removeUselessStrokeAndFill', 'removeViewBox', 'removeXMLProcInst', 'sortAttrs',
    ];

    // Always keep the viewBox.
    let activePlugins = defaultPlugins.filter(p => p !== 'removeViewBox');

    // If we're exporting for PNG, we need the dimensions. Otherwise, we can remove them.
    if (keepDimensions) {
      activePlugins = activePlugins.filter(p => p !== 'removeDimensions');
    }

    const { data } = optimize(rawSvgString, {
      multipass: true,
      plugins: activePlugins,
    });
    return data;
  } catch (error) {
    console.error("SVGO optimization failed:", error);
    // Fallback to the unoptimized version if SVGO fails.
    return rawSvgString;
  }
}