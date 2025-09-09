import type { Point } from '../../types';

const MAX_RADIUS = 1_000_000; // A very large radius limit to prevent errors

/**
 * Calculates the center and radius of a circle passing through three distinct points.
 * Returns null if the points are collinear or the radius is excessively large.
 */
export function getCircleFromThreePoints(p1: Point, p2: Point, p3: Point): { center: Point, radius: number } | null {
    const d = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));

    // Points are collinear
    if (Math.abs(d) < 1e-8) {
        return null;
    }

    const p1Sq = p1.x * p1.x + p1.y * p1.y;
    const p2Sq = p2.x * p2.x + p2.y * p2.y;
    const p3Sq = p3.x * p3.x + p3.y * p3.y;

    const ux = (p1Sq * (p2.y - p3.y) + p2Sq * (p3.y - p1.y) + p3Sq * (p1.y - p2.y)) / d;
    const uy = (p1Sq * (p3.x - p2.x) + p2Sq * (p1.x - p3.x) + p3Sq * (p2.x - p1.x)) / d;

    const center = { x: ux, y: uy };
    const radius = Math.sqrt(Math.pow(p1.x - ux, 2) + Math.pow(p1.y - uy, 2));
    
    // Points are nearly collinear, resulting in a huge radius
    if (radius > MAX_RADIUS) {
        return null;
    }

    return { center, radius };
}


/**
 * Calculates the SVG path `d` attribute for a circular arc defined by three points.
 */
export function calculateArcPathD(p1: Point, p2: Point, p3: Point): string | null {
    const circle = getCircleFromThreePoints(p1, p2, p3);

    if (!circle) {
        // Fallback to a line if points are collinear
        return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    }

    const { center, radius } = circle;
    
    // Determine sweep flag by checking the orientation of the three points (p1, p3, p2).
    // A positive cross product means p1->p3->p2 is a CW turn in a Y-down system.
    const crossProduct = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
    // sweep-flag=0 is CW, 1 is CCW.
    const sweepFlag = crossProduct > 0 ? 0 : 1;
    
    // To determine the large-arc-flag, we calculate the total angle swept by the arc p1->p3->p2.
    // If the total angle is > 180 degrees, it's a large arc.
    const angle = (v1: Point, v2: Point) => Math.atan2(v2.y, v2.x) - Math.atan2(v1.y, v1.x);

    const v_center_p1 = { x: p1.x - center.x, y: p1.y - center.y };
    const v_center_p2 = { x: p2.x - center.x, y: p2.y - center.y };
    const v_center_p3 = { x: p3.x - center.x, y: p3.y - center.y };

    let angle13 = angle(v_center_p1, v_center_p3);
    let angle32 = angle(v_center_p3, v_center_p2);

    // Ensure the individual sweep angles match the overall sweep direction
    if (sweepFlag === 1) { // CCW
        if (angle13 < 0) angle13 += 2 * Math.PI;
        if (angle32 < 0) angle32 += 2 * Math.PI;
    } else { // CW
        if (angle13 > 0) angle13 -= 2 * Math.PI;
        if (angle32 > 0) angle32 -= 2 * Math.PI;
    }

    const totalAngle = angle13 + angle32;
    const largeArcFlag = Math.abs(totalAngle) > Math.PI ? 1 : 0;

    return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${p2.x} ${p2.y}`;
}

/**
 * Samples points along a circular arc for rough rendering.
 */
export function sampleArc(p1: Point, p2: Point, p3: Point, steps: number = 20): Point[] {
    const circle = getCircleFromThreePoints(p1, p2, p3);
    if (!circle) {
        // Fallback for collinear points
        return [p1, p2];
    }

    const { center, radius } = circle;

    let startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
    let midAngle = Math.atan2(p3.y - center.y, p3.x - center.x);
    let endAngle = Math.atan2(p2.y - center.y, p2.x - center.x);
    
    const crossProduct = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
    const sweepFlag = crossProduct > 0 ? 0 : 1;

    // Normalize angles to be relative to the start angle, which simplifies checking
    // if the mid angle lies on the shorter or longer arc path.
    let normalizedMid = midAngle - startAngle;
    let normalizedEnd = endAngle - startAngle;

    // Wrap angles to the range [-2PI, 2PI]
    if (normalizedMid > Math.PI) normalizedMid -= 2 * Math.PI;
    if (normalizedMid < -Math.PI) normalizedMid += 2 * Math.PI;
    if (normalizedEnd > Math.PI) normalizedEnd -= 2 * Math.PI;
    if (normalizedEnd < -Math.PI) normalizedEnd += 2 * Math.PI;

    // If the sweep direction and the signs of the angles don't match, it means
    // the arc crosses the PI/-PI boundary, so we should take the other path.
    if ((sweepFlag === 1 && normalizedEnd > 0) || (sweepFlag === 0 && normalizedEnd < 0)) {
       if (normalizedEnd > 0) normalizedEnd -= 2 * Math.PI;
       else normalizedEnd += 2 * Math.PI;
    }

    // Now, check if the middle point is on this arc. If not, we take the longer arc.
    const midOnShortArc = (normalizedMid >= Math.min(0, normalizedEnd) && normalizedMid <= Math.max(0, normalizedEnd));
    
    if (!midOnShortArc) {
       // Take the other direction
       if (normalizedEnd > 0) normalizedEnd -= 2 * Math.PI;
       else normalizedEnd += 2 * Math.PI;
    }

    const points: Point[] = [];
    const totalAngle = normalizedEnd;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = startAngle + t * totalAngle;
        points.push({
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle),
        });
    }

    return points;
}