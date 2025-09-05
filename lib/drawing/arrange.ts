/**
 * 本文件包含了用于排列和分布画布上对象的函数。
 */
import type { AnyPath, Alignment, DistributeMode, BBox } from '../../types';
import { getPathBoundingBox, getPathsBoundingBox } from './bbox';
import { movePath } from './transform';

/**
 * 对齐选中的图形。
 * @param selectedPaths - 要对齐的图形数组。
 * @param alignment - 对齐方式。
 * @returns 返回一个包含对齐后图形的新数组。
 */
export function alignPaths(selectedPaths: AnyPath[], alignment: Alignment): AnyPath[] {
  if (selectedPaths.length < 2) return selectedPaths;

  const selectionBbox = getPathsBoundingBox(selectedPaths, true);
  if (!selectionBbox) return selectedPaths;

  return selectedPaths.map(path => {
    const pathBbox = getPathBoundingBox(path, true);
    let dx = 0;
    let dy = 0;

    switch (alignment) {
      case 'left':
        dx = selectionBbox.x - pathBbox.x;
        break;
      case 'right':
        dx = (selectionBbox.x + selectionBbox.width) - (pathBbox.x + pathBbox.width);
        break;
      case 'h-center':
        dx = (selectionBbox.x + selectionBbox.width / 2) - (pathBbox.x + pathBbox.width / 2);
        break;
      case 'top':
        dy = selectionBbox.y - pathBbox.y;
        break;
      case 'bottom':
        dy = (selectionBbox.y + selectionBbox.height) - (pathBbox.y + pathBbox.height);
        break;
      case 'v-center':
        dy = (selectionBbox.y + selectionBbox.height / 2) - (pathBbox.y + pathBbox.height / 2);
        break;
    }

    return movePath(path, dx, dy);
  });
}

/**
 * 分布选中的图形。
 * @param selectedPaths - 要分布的图形数组。
 * @param axis -分布轴向
 * @param options - 分布选项
 * @returns 返回一个包含分布后图形的新数组。
 */
export function distributePaths(selectedPaths: AnyPath[], axis: 'horizontal' | 'vertical', options: { spacing?: number | null; mode: DistributeMode }): AnyPath[] {
  if (selectedPaths.length < 2) return selectedPaths;

  const pathsWithBboxes = selectedPaths.map(p => ({ path: p, bbox: getPathBoundingBox(p, true) }));

  if (axis === 'horizontal') {
    pathsWithBboxes.sort((a, b) => a.bbox.x - b.bbox.x);
  } else {
    pathsWithBboxes.sort((a, b) => a.bbox.y - b.bbox.y);
  }

  // Handle distribution by a fixed spacing value
  if (options.spacing != null && options.spacing >= 0) {
    const newPaths: AnyPath[] = [pathsWithBboxes[0].path];

    if (options.mode === 'centers') {
      if (axis === 'horizontal') {
        let lastCenter_x = pathsWithBboxes[0].bbox.x + pathsWithBboxes[0].bbox.width / 2;
        for (let i = 1; i < pathsWithBboxes.length; i++) {
          const p = pathsWithBboxes[i];
          const targetCenter_x = lastCenter_x + options.spacing;
          const currentCenter_x = p.bbox.x + p.bbox.width / 2;
          const dx = targetCenter_x - currentCenter_x;
          newPaths.push(movePath(p.path, dx, 0));
          lastCenter_x = targetCenter_x;
        }
      } else { // vertical
        let lastCenter_y = pathsWithBboxes[0].bbox.y + pathsWithBboxes[0].bbox.height / 2;
        for (let i = 1; i < pathsWithBboxes.length; i++) {
          const p = pathsWithBboxes[i];
          const targetCenter_y = lastCenter_y + options.spacing;
          const currentCenter_y = p.bbox.y + p.bbox.height / 2;
          const dy = targetCenter_y - currentCenter_y;
          newPaths.push(movePath(p.path, 0, dy));
          lastCenter_y = targetCenter_y;
        }
      }
      return newPaths;
    } else { // 'edges' or default
      let currentEdge = (axis === 'horizontal')
        ? pathsWithBboxes[0].bbox.x + pathsWithBboxes[0].bbox.width
        : pathsWithBboxes[0].bbox.y + pathsWithBboxes[0].bbox.height;

      for (let i = 1; i < pathsWithBboxes.length; i++) {
        const p = pathsWithBboxes[i];
        if (axis === 'horizontal') {
          const dx = currentEdge + options.spacing - p.bbox.x;
          newPaths.push(movePath(p.path, dx, 0));
          currentEdge += options.spacing + p.bbox.width;
        } else { // vertical
          const dy = currentEdge + options.spacing - p.bbox.y;
          newPaths.push(movePath(p.path, 0, dy));
          currentEdge += options.spacing + p.bbox.height;
        }
      }
      return newPaths;
    }
  }
  
  // Handle "space evenly" distribution, which requires at least 3 items
  if (selectedPaths.length < 3) return selectedPaths; 

  const first = pathsWithBboxes[0];
  const last = pathsWithBboxes[pathsWithBboxes.length - 1];
  const innerPaths = pathsWithBboxes.slice(1, -1);
  
  if (options.mode === 'centers') {
    const getCenter = (bbox: BBox) => (axis === 'horizontal') ? bbox.x + bbox.width / 2 : bbox.y + bbox.height / 2;
    
    const firstCenter = getCenter(first.bbox);
    const lastCenter = getCenter(last.bbox);
    const totalSpan = lastCenter - firstCenter;
    const gap = totalSpan / (pathsWithBboxes.length - 1);
    
    let currentCenter = firstCenter + gap;
    const distributedInnerPaths = innerPaths.map(p => {
        const pCenter = getCenter(p.bbox);
        const delta = currentCenter - pCenter;
        const newPath = (axis === 'horizontal') ? movePath(p.path, delta, 0) : movePath(p.path, 0, delta);
        currentCenter += gap;
        return newPath;
    });

    return [first.path, ...distributedInnerPaths, last.path];

  } else { // mode === 'edges'
    if (axis === 'horizontal') {
      const totalInnerSize = innerPaths.reduce((sum, p) => sum + p.bbox.width, 0);
      const totalSpan = last.bbox.x - (first.bbox.x + first.bbox.width);
      const gap = (totalSpan - totalInnerSize) / (innerPaths.length + 1);

      let currentX = first.bbox.x + first.bbox.width + gap;
      const distributedInnerPaths = innerPaths.map(p => {
        const dx = currentX - p.bbox.x;
        const newPath = movePath(p.path, dx, 0);
        currentX += p.bbox.width + gap;
        return newPath;
      });
      return [first.path, ...distributedInnerPaths, last.path];
    } else { // vertical
      const totalInnerSize = innerPaths.reduce((sum, p) => sum + p.bbox.height, 0);
      const totalSpan = last.bbox.y - (first.bbox.y + first.bbox.height);
      const gap = (totalSpan - totalInnerSize) / (innerPaths.length + 1);

      let currentY = first.bbox.y + first.bbox.height + gap;
      const distributedInnerPaths = innerPaths.map(p => {
        const dy = currentY - p.bbox.y;
        const newPath = movePath(p.path, 0, dy);
        currentY += p.bbox.height + gap;
        return newPath;
      });
      return [first.path, ...distributedInnerPaths, last.path];
    }
  }
}
