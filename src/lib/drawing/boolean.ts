/**
 * 本文件包含了使用 paper.js 进行布尔运算的逻辑。
 */
import paper from 'paper';
import type { AnyPath, VectorPathData, Anchor } from '../../types';
import {
  rectangleToVectorPath,
  ellipseToVectorPath,
  polygonToVectorPath,
  brushToVectorPath,
  lineToVectorPath,
  arcToVectorPath,
} from './convert';

/**
 * 将任何支持的图形转换为 VectorPathData，以便进行布尔运算。
 * @param path - 要转换的图形。
 * @returns 转换后的 VectorPathData，如果不支持则返回 null。
 */
function ensureVectorPath(path: AnyPath): VectorPathData | null {
  switch (path.tool) {
    case 'pen':
      return path;
    case 'rectangle':
      return rectangleToVectorPath(path);
    case 'ellipse':
      return ellipseToVectorPath(path);
    case 'polygon':
      return polygonToVectorPath(path);
    case 'line':
      return lineToVectorPath(path);
    case 'brush':
      return brushToVectorPath(path);
    case 'arc':
        return arcToVectorPath(path);
    case 'text':
    case 'image':
        // 将文本和图像的边界框转换为路径
        return rectangleToVectorPath({
            ...path,
            tool: 'rectangle',
            borderRadius: 0,
        });
    case 'group':
      // 布尔运算不支持组，应在调用前解组。
      return null;
    default:
      return null;
  }
}

/**
 * 将 VectorPathData 转换为 paper.Path 对象。
 * @param path - 要转换的 VectorPathData。
 * @returns 转换后的 paper.Path 对象。
 */
function vectorToPaperPath(path: VectorPathData): paper.Path {
  const paperPath = new paper.Path({
    segments: path.anchors.map(a => new paper.Segment(
      new paper.Point(a.point.x, a.point.y),
      new paper.Point(a.handleIn.x - a.point.x, a.handleIn.y - a.point.y),
      new paper.Point(a.handleOut.x - a.point.x, a.handleOut.y - a.point.y)
    )),
    closed: path.isClosed,
  });
  return paperPath;
}

/**
 * 将 paper.Path 对象转换回 VectorPathData。
 * @param paperPath - 要转换的 paper.Path 对象。
 * @param baseProps - 新路径要继承的基础样式属性。
 * @returns 转换后的 VectorPathData。
 */
function paperToVectorPath(paperPath: paper.Path, baseProps: Omit<VectorPathData, 'anchors' | 'tool' | 'id' | 'isClosed'>): VectorPathData {
    const anchors: Anchor[] = paperPath.segments.map(s => ({
        point: { x: s.point.x, y: s.point.y },
        handleIn: { x: s.point.x + s.handleIn.x, y: s.point.y + s.handleIn.y },
        handleOut: { x: s.point.x + s.handleOut.x, y: s.point.y + s.handleOut.y },
    }));

    return {
        ...baseProps,
        id: `${Date.now()}-boolean`,
        tool: 'pen',
        anchors,
        isClosed: paperPath.closed,
    };
}


/**
 * 对一组图形执行布尔运算。
 * @param paths - 要操作的图形数组。
 * @param operation - 要执行的操作类型。
 * @returns 操作产生的新图形数组，如果结果为空则返回 null。
 */
export function performBooleanOperation(
  paths: AnyPath[],
  operation: 'unite' | 'subtract' | 'intersect' | 'exclude' | 'trim'
): AnyPath[] | null {
  const project = new paper.Project(document.createElement('canvas'));
  
  const vectorPaths = paths.map(ensureVectorPath).filter((p): p is VectorPathData => p !== null);
  if (vectorPaths.length < 2) {
    project.remove();
    return null;
  }

  const paperPaths = vectorPaths.map(p => vectorToPaperPath(p));

  if (operation === 'trim') {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { anchors, tool, id, isClosed, ...baseProps } = vectorPaths[0];

    // 使用 divide 操作让后续路径的轮廓切割第一条路径
    let currentPaths: paper.Path[] = [paperPaths[0]];
    for (let i = 1; i < paperPaths.length; i++) {
      const divider = paperPaths[i];
      const nextPaths: paper.Path[] = [];
      currentPaths.forEach(p => {
        const group = p.divide(divider);
        group.children.forEach(child => {
          if (child instanceof paper.Path && !child.isEmpty()) {
            nextPaths.push(child);
          }
        });
      });
      currentPaths = nextPaths;
    }

    if (currentPaths.length === 0) {
      project.remove();
      return null;
    }

    const newVectorPaths = currentPaths.map((p, i) => {
      const newPath = paperToVectorPath(p, baseProps);
      newPath.id = `${Date.now()}-boolean-${i}`;
      return newPath;
    });

    project.remove();
    return newVectorPaths;
  }

  let resultPathItem: paper.PathItem | null = paperPaths[0];

  for (let i = 1; i < paperPaths.length; i++) {
    if (!resultPathItem) break;
    resultPathItem = resultPathItem[operation](paperPaths[i]);
  }

  if (!resultPathItem || resultPathItem.isEmpty()) {
    project.remove();
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { anchors, tool, id, isClosed, ...baseProps } = vectorPaths[0];

  const simplePaths: paper.Path[] = [];
  if (resultPathItem instanceof paper.CompoundPath) {
      resultPathItem.children.forEach(child => {
          if (child instanceof paper.Path) {
              simplePaths.push(child);
          }
      });
  } else if (resultPathItem instanceof paper.Path) {
      simplePaths.push(resultPathItem);
  }

  const newVectorPaths = simplePaths.map((p, i) => {
    const newPath = paperToVectorPath(p, baseProps);
    newPath.id = `${Date.now()}-boolean-${i}`;
    return newPath;
  });

  project.remove();
  return newVectorPaths;
}
