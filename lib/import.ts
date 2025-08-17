import paper from 'paper';
import type { AnyPath, VectorPathData, Anchor, Point, RectangleData, EllipseData } from '../types';
import { DEFAULT_ROUGHNESS, DEFAULT_BOWING, DEFAULT_FILL_WEIGHT, DEFAULT_HACHURE_ANGLE, DEFAULT_HACHURE_GAP, DEFAULT_CURVE_TIGHTNESS, DEFAULT_CURVE_STEP_COUNT } from '../constants';

/**
 * Converts a paper.js Point object to our internal Point type.
 */
function paperPointToPoint(p: paper.Point): Point {
    return { x: p.x, y: p.y };
}

/**
 * Converts a paper.js Color object to a CSS color string (rgba/rgb), preserving alpha.
 * Returns 'transparent' for null/undefined colors.
 */
function paperColorToCss(c: paper.Color | null | undefined): string {
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
const getSharedSvgProps = (item: paper.Item) => {
    const rotationInRadians = item.rotation ? item.rotation * (Math.PI / 180) : 0;
    const dashArray = (item.dashArray && item.dashArray.length >= 2) ? [item.dashArray[0], item.dashArray[1]] as [number, number] : undefined;

    return {
        id: `${Date.now()}-${Math.random()}`,
        color: paperColorToCss(item.strokeColor),
        strokeWidth: item.strokeWidth ?? 1,
        strokeLineDash: dashArray,
        fill: paperColorToCss(item.fillColor),
        // Default "smooth" properties for imported SVGs, as they are not hand-drawn
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
export function importSvg(svgString: string): AnyPath[] {
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
            const rect = item as paper.Shape.Rectangle;
            newPath = {
                ...getSharedSvgProps(rect),
                tool: 'rectangle',
                x: rect.bounds.x,
                y: rect.bounds.y,
                width: rect.bounds.width,
                height: rect.bounds.height,
            } as RectangleData;
        } else if (item instanceof paper.Shape.Ellipse && !isComplex) {
            const ellipse = item as paper.Shape.Ellipse;
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
            const path = (item as any).toPath ? ((item as any).toPath() as paper.Path) : null;
            if (path && path.segments && path.segments.length > 0) {
                 const anchors: Anchor[] = path.segments.map((segment: paper.Segment) => ({
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