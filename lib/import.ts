/**
 * 本文件负责处理 SVG 导入逻辑。
 * 它使用 paper.js 库将 SVG 字符串解析为应用内部所使用的数据格式（AnyPath），
 * 从而允许用户将外部 SVG 文件导入到白板中。
 */

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
    const rotationInRadians = item.rotation ? item.rotation * (Math.PI / 180) : 0;
    const dashArray = (item.dashArray && item.dashArray.length >= 2) ? [item.dashArray[0], item.dashArray[1]] as [number, number] : undefined;

    // Use hasFill() and hasStroke() for more robust color parsing.
    // This correctly handles fill="none" and stroke="none" attributes.
    // The `item` is a leaf node from paper.js and should be a PathItem derivative,
    // which has these methods, but we check for them due to generic types.
    const hasFill = typeof (item as any).hasFill === 'function' && (item as any).hasFill();
    const hasStroke = typeof (item as any).hasStroke === 'function' && (item as any).hasStroke();

    let capStyle: 'round' | 'butt' | 'square_cap' = 'round'; // Default to round
    if (item.strokeCap === 'square') {
        capStyle = 'square_cap';
    } else if (item.strokeCap === 'butt') {
        capStyle = 'butt';
    }

    return {
        id: `${Date.now()}-${Math.random()}`,
        color: hasStroke ? paperColorToCss(item.strokeColor) : 'transparent',
        strokeWidth: hasStroke ? (item.strokeWidth ?? 1) : 0,
        strokeLineDash: dashArray,
        strokeLineJoin: item.strokeJoin as 'miter' | 'round' | 'bevel' | undefined,
        strokeLineCapStart: capStyle,
        strokeLineCapEnd: capStyle,
        fill: hasFill ? paperColorToCss(item.fillColor) : 'transparent',
        opacity: item.opacity ?? 1,
        // Default "smooth" properties for imported SVGs, as they are not hand-drawn
        isRough: false,
        fillStyle: 'solid', // Most SVGs use solid fills
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
export async function importSvg(svgString: string): Promise<AnyPath[]> {
    const paper = (await import('paper')).default as any;
    const project = new paper.Project(document.createElement('canvas'));
    
    project.importSVG(svgString, {
        expandShapes: false, // Keep shapes as shapes to inspect them
        insert: true,
    });

    const importedPaths: AnyPath[] = [];

    const items = project.getItems({ recursive: true });

    for (const item of items) {
        // We only want leaf nodes that are visible and have some geometry
        // FIX: Added a guard for item.children, as Path/Shape items do not have it.
        if ((item.children && item.children.length > 0) || !item.visible || (!item.bounds.width && !item.bounds.height)) {
            continue;
        }

        let newPath: AnyPath | null = null;
        
        // A check for complex transformations (like shear). If found, convert to a path.
        const isComplex = Math.abs(item.matrix.b) > 1e-6 || Math.abs(item.matrix.c) > 1e-6;

        if (item instanceof paper.Shape.Rectangle && !isComplex) {
            const rect = item as any;
            newPath = {
                ...getSharedSvgProps(rect),
                tool: 'rectangle',
                x: rect.bounds.x,
                y: rect.bounds.y,
                width: rect.bounds.width,
                height: rect.bounds.height,
            } as RectangleData;
        } else if (item instanceof paper.Shape.Ellipse && !isComplex) {
            const ellipse = item as any;
            newPath = {
                ...getSharedSvgProps(ellipse),
                tool: 'ellipse',
                x: ellipse.bounds.x,
                y: ellipse.bounds.y,
                width: ellipse.bounds.width,
                height: ellipse.bounds.height,
            } as EllipseData;
        } else {
            // For all other cases (Paths, complex Shapes, etc.), convert to a generic vector path
            // to ensure visual fidelity is maintained.
            const path = (item as any).toPath ? ((item as any).toPath()) : null;
            if (path && path.segments && path.segments.length > 0) {
                 const anchors: Anchor[] = path.segments.map((segment: any) => ({
                    point: paperPointToPoint(segment.point),
                    handleIn: paperPointToPoint(segment.point.add(segment.handleIn)),
                    handleOut: paperPointToPoint(segment.point.add(segment.handleOut)),
                }));
                
                newPath = {
                    ...getSharedSvgProps(item), // Get props from original item for color/stroke
                    tool: 'pen',
                    anchors,
                    isClosed: path.closed,
                } as VectorPathData;
                
                // After converting, we must remove the temporary path to avoid memory leaks
                path.remove();
            }
        }

        if (newPath) {
            importedPaths.push(newPath);
        }
    }

    project.remove();
    return importedPaths;
}