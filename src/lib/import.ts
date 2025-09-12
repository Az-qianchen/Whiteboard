/**
 * 本文件负责处理 SVG 导入逻辑。
 * 它使用 paper.js 库将 SVG 字符串解析为应用内部所使用的数据格式（AnyPath），
 * 从而允许用户将外部 SVG 文件导入到白板中。
 */
import paper from 'paper';
import type { AnyPath, VectorPathData, Anchor, Point, RectangleData, EllipseData } from '../types';
import { DEFAULT_ROUGHNESS, DEFAULT_BOWING, DEFAULT_FILL_WEIGHT, DEFAULT_HACHURE_ANGLE, DEFAULT_HACHURE_GAP, DEFAULT_CURVE_TIGHTNESS, DEFAULT_CURVE_STEP_COUNT } from '../constants';

/**
 * Converts a paper.js Point object to our internal Point type.
 */
function paperPointToPoint(p: any): Point {
    return { x: p.x, y: p.y };
}

/**
 * Converts a paper.js Color object to a CSS color string (rgba/rgb), preserving alpha.
 * Returns 'transparent' for null/undefined colors.
 */
function paperColorToCss(c: any | null | undefined): string {
    if (!c) return 'transparent';
    
    // paper.js color components are 0-1. We need 0-255 for rgb().
    const r = Math.round((c.red ?? 0) * 255);
    const g = Math.round((c.green ?? 0) * 255);
    const b = Math.round((c.blue ?? 0) * 255);
    const a = c.alpha ?? 1; // Default to opaque if alpha is null/undefined

    if (a < 1) {
        // Use toFixed to avoid long decimals for alpha
        return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
    } else {
        return `rgb(${r}, ${g}, ${b})`;
    }
}

// Shared properties for any new path created from an SVG item
const getSharedSvgProps = (item: any) => {
  const parent = item.parent;
  const styleSource = parent instanceof paper.CompoundPath ? parent : item;
  const rotationDeg = item.rotation ?? styleSource.rotation ?? 0;
  const rotationInRadians = rotationDeg * (Math.PI / 180);
  const dashArray =
    styleSource.dashArray && styleSource.dashArray.length >= 2
      ? ([styleSource.dashArray[0], styleSource.dashArray[1]] as [number, number])
      : undefined;

  const hasFill = typeof styleSource.hasFill === 'function' && styleSource.hasFill();
  const hasStroke = typeof styleSource.hasStroke === 'function' && styleSource.hasStroke();

  let capStyle: 'round' | 'butt' | 'square_cap' = 'round';
  if (styleSource.strokeCap === 'square') {
    capStyle = 'square_cap';
  } else if (styleSource.strokeCap === 'butt') {
    capStyle = 'butt';
  }

  let fillColor = 'transparent';
  if (hasFill) {
    if (parent instanceof paper.CompoundPath && typeof item.area === 'number' && item.area < 0) {
      fillColor = 'transparent';
    } else {
      fillColor = paperColorToCss(styleSource.fillColor);
    }
  }

  return {
    id: `${Date.now()}-${Math.random()}`,
    color: hasStroke ? paperColorToCss(styleSource.strokeColor) : 'transparent',
    strokeWidth: hasStroke ? styleSource.strokeWidth ?? 1 : 0,
    strokeLineDash: dashArray,
    strokeLineJoin: styleSource.strokeJoin as 'miter' | 'round' | 'bevel' | undefined,
    strokeLineCapStart: capStyle,
    strokeLineCapEnd: capStyle,
    fill: fillColor,
    opacity: styleSource.opacity ?? 1,
    isRough: false,
    fillStyle: 'solid',
    roughness: 0,
    bowing: 0,
    fillWeight: DEFAULT_FILL_WEIGHT,
    hachureAngle: DEFAULT_HACHURE_ANGLE,
    hachureGap: DEFAULT_HACHURE_GAP,
    curveTightness: DEFAULT_CURVE_TIGHTNESS,
    curveStepCount: DEFAULT_CURVE_STEP_COUNT,
    rotation: rotationInRadians,
  };
};


/**
 * Imports an SVG string and converts its contents into an array of editable AnyPath objects,
 * preserving primitive shapes and colors where possible.
 * @param svgString The raw SVG content as a string.
 * @returns An array of AnyPath objects compatible with the whiteboard.
 */
export function importSvg(svgString: string): AnyPath[] {
    const project = new paper.Project(document.createElement('canvas'));
    
    const importedItem = project.importSVG(svgString, {
        expandShapes: false,
        insert: true,
    });

    if (!importedItem) {
        project.remove();
        return [];
    }

    const importedPaths: AnyPath[] = [];

    // Correctly get all descendant items from the active layer.
    const items = project.activeLayer.getItems({ recursive: true });

    for (const item of items) {
        if (item.children?.length > 0 || !item.visible || (!item.bounds.width && !item.bounds.height)) {
            continue;
        }

        let newPath: AnyPath | null = null;
        const isComplex = Math.abs(item.matrix.b) > 1e-6 || Math.abs(item.matrix.c) > 1e-6;

        if (item instanceof paper.Shape.Rectangle && !isComplex) {
            newPath = {
                ...getSharedSvgProps(item),
                tool: 'rectangle',
                x: item.bounds.x,
                y: item.bounds.y,
                width: item.bounds.width,
                height: item.bounds.height,
            } as RectangleData;
        } else if (item instanceof paper.Shape.Ellipse && !isComplex) {
            newPath = {
                ...getSharedSvgProps(item),
                tool: 'ellipse',
                x: item.bounds.x,
                y: item.bounds.y,
                width: item.bounds.width,
                height: item.bounds.height,
            } as EllipseData;
        } else {
            let path = item;
            let tempPath = null;
            // If it's a Shape, convert it to a Path to get its segments
            if (typeof (item as any).toPath === 'function') {
                tempPath = (item as any).toPath();
                path = tempPath;
            }

            if (path instanceof paper.Path && path.segments?.length > 0) {
                 const anchors: Anchor[] = path.segments.map((segment: any) => ({
                    point: paperPointToPoint(segment.point),
                    handleIn: paperPointToPoint(segment.point.add(segment.handleIn)),
                    handleOut: paperPointToPoint(segment.point.add(segment.handleOut)),
                }));
                
                newPath = {
                    ...getSharedSvgProps(item),
                    tool: 'pen',
                    anchors,
                    isClosed: path.closed,
                } as VectorPathData;
            }
            
            // Clean up the temporary path if one was created
            if (tempPath) {
                tempPath.remove();
            }
        }

        if (newPath) {
            importedPaths.push(newPath);
        }
    }

    project.remove();
    return importedPaths;
}
