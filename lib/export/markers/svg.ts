


import type { EndpointStyle } from '../../types';

/**
 * Creates an SVG <marker> element for use with `marker-start` and `marker-end`.
 */
export function createSvgMarker(
    id: string,
    type: EndpointStyle,
    color: string,
    endpointSize: number,
    endpointFill: 'solid' | 'hollow',
    isStart: boolean
): SVGMarkerElement | null {
    const svgNS = 'http://www.w3.org/2000/svg';
    const marker = document.createElementNS(svgNS, 'marker');
    marker.setAttribute('id', id);
    marker.setAttribute('markerUnits', 'strokeWidth');

    let orient = isStart ? 'auto-start-reverse' : 'auto';
    if (type === 'reverse_arrow') {
        orient = isStart ? 'auto' : 'auto-start-reverse';
    }
    marker.setAttribute('orient', orient);

    const useSolidFill = endpointFill === 'solid';
    let shape: SVGElement | null = null;
    const size = 10;
    marker.setAttribute('viewBox', `0 0 ${size} ${size}`);

    switch (type) {
        case 'arrow':
        case 'reverse_arrow':
            marker.setAttribute('refX', '8');
            marker.setAttribute('refY', '5');
            marker.setAttribute('markerWidth', `${1.5 * endpointSize}`);
            marker.setAttribute('markerHeight', `${1.5 * endpointSize}`);
            shape = document.createElementNS(svgNS, 'path');
            shape.setAttribute('d', 'M 0 2 L 8 5 L 0 8');
            break;
        case 'triangle':
            marker.setAttribute('refX', '10');
            marker.setAttribute('refY', '5');
            marker.setAttribute('markerWidth', `${1.8 * endpointSize}`);
            marker.setAttribute('markerHeight', `${1.8 * endpointSize}`);
            shape = document.createElementNS(svgNS, 'path');
            shape.setAttribute('d', `M 0 0 L 10 5 L 0 10 z`);
            break;
        case 'dot':
            marker.setAttribute('refX', '0');
            marker.setAttribute('refY', '5');
            marker.setAttribute('markerWidth', `${1.8 * endpointSize}`);
            marker.setAttribute('markerHeight', `${1.8 * endpointSize}`);
            shape = document.createElementNS(svgNS, 'path');
            shape.setAttribute('d', `M 0 5 L 10 0 L 10 10 z`);
            break;
        case 'circle':
            marker.setAttribute('refX', `${size / 2}`);
            marker.setAttribute('refY', `${size / 2}`);
            marker.setAttribute('markerWidth', `${2 * endpointSize}`);
            marker.setAttribute('markerHeight', `${2 * endpointSize}`);
            shape = document.createElementNS(svgNS, 'circle');
            shape.setAttribute('cx', `${size / 2}`);
            shape.setAttribute('cy', `${size / 2}`);
            shape.setAttribute('r', `${size / 2 * 0.9}`);
            break;
        case 'square':
            marker.setAttribute('refX', `${size / 2}`);
            marker.setAttribute('refY', `${size / 2}`);
            marker.setAttribute('markerWidth', `${1.8 * endpointSize}`);
            marker.setAttribute('markerHeight', `${1.8 * endpointSize}`);
            shape = document.createElementNS(svgNS, 'rect');
            shape.setAttribute('x', `${size * 0.1}`);
            shape.setAttribute('y', `${size * 0.1}`);
            shape.setAttribute('width', `${size * 0.8}`);
            shape.setAttribute('height', `${size * 0.8}`);
            break;
        case 'diamond':
            marker.setAttribute('refX', `${size / 2}`);
            marker.setAttribute('refY', `${size / 2}`);
            marker.setAttribute('markerWidth', `${2 * endpointSize}`);
            marker.setAttribute('markerHeight', `${2 * endpointSize}`);
            shape = document.createElementNS(svgNS, 'path');
            shape.setAttribute('d', `M ${size/2} 0 L ${size} ${size/2} L ${size/2} ${size} L 0 ${size/2} z`);
            break;
        case 'bar':
            marker.setAttribute('refX', '5');
            marker.setAttribute('refY', '5');
            marker.setAttribute('markerWidth', `${0.25 * endpointSize}`);
            marker.setAttribute('markerHeight', `${2.5 * endpointSize}`);
            shape = document.createElementNS(svgNS, 'line');
            shape.setAttribute('x1', '5');
            shape.setAttribute('y1', '0');
            shape.setAttribute('x2', '5');
            shape.setAttribute('y2', '10');
            break;
        case 'round':
            marker.setAttribute('viewBox', '0 0 2 2');
            marker.setAttribute('refX', '1');
            marker.setAttribute('refY', '1');
            marker.setAttribute('markerWidth', '1');
            marker.setAttribute('markerHeight', '1');
            shape = document.createElementNS(svgNS, 'circle');
            shape.setAttribute('cx', '1');
            shape.setAttribute('cy', '1');
            shape.setAttribute('r', '1');
            break;
        case 'square_cap':
            marker.setAttribute('viewBox', '0 0 2 2');
            marker.setAttribute('refX', '1');
            marker.setAttribute('refY', '1');
            marker.setAttribute('markerWidth', '1');
            marker.setAttribute('markerHeight', '1');
            shape = document.createElementNS(svgNS, 'rect');
            shape.setAttribute('x', '0');
            shape.setAttribute('y', '0');
            shape.setAttribute('width', '2');
            shape.setAttribute('height', '2');
            break;
        default: return null;
    }

    if (shape) {
        const isFillable = ['triangle', 'dot', 'circle', 'square', 'diamond'].includes(type);
        const isTrueCap = ['round', 'square_cap'].includes(type);
        const isLine = ['arrow', 'reverse_arrow', 'bar'].includes(type);
        
        if (isFillable) {
            shape.setAttribute('stroke', color);
            shape.setAttribute('stroke-width', '1');
            shape.setAttribute('fill', useSolidFill ? color : 'transparent');
            shape.setAttribute('stroke-linecap', 'round');
            shape.setAttribute('stroke-linejoin', 'round');
        } else if (isTrueCap) {
            shape.setAttribute('fill', color);
            shape.setAttribute('stroke', 'none');
        } else if (isLine) {
            shape.setAttribute('stroke', color);
            shape.setAttribute('stroke-width', '1.5'); // A bit thicker for better visibility
            shape.setAttribute('fill', 'none');
            shape.setAttribute('stroke-linecap', 'round');
            shape.setAttribute('stroke-linejoin', 'round');
        }
        marker.appendChild(shape);
    }
    return marker;
}