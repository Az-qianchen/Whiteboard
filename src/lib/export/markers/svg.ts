/**
 * 本文件定义了用于为平滑路径创建 SVG <marker> 元素的函数。
 * 这些标记（如箭头、圆点）用于实现路径的起点和终点样式。
 */
import type { EndpointStyle } from '../../types';

/**
 * 为平滑路径创建 SVG <marker> 元素。
 * @param id - 标记的唯一 ID。
 * @param type - 端点样式类型。
 * @param color - 标记的颜色。
 * @param endpointSize - 端点尺寸的乘数。
 * @param endpointFill - 端点填充样式（'solid' 或 'hollow'）。
 * @param isStart - 是否为起点标记。
 * @returns 返回一个配置好的 SVGMarkerElement，如果样式为 'none' 则返回 null。
 */
export function createSvgMarker(
    id: string,
    type: EndpointStyle,
    color: string,
    endpointSize: number,
    endpointFill: 'solid' | 'hollow',
    isStart: boolean
): SVGMarkerElement | null {
    if (type === 'none' || type === 'butt') return null;

    const svgNS = 'http://www.w3.org/2000/svg';
    const marker = document.createElementNS(svgNS, 'marker');
    marker.setAttribute('id', id);
    marker.setAttribute('markerUnits', 'strokeWidth');
    marker.setAttribute('orient', isStart ? 'auto-start-reverse' : 'auto');
    marker.setAttribute('shape-rendering', 'geometricPrecision');

    const useSolidFill = endpointFill === 'solid';
    let shape: SVGElement | null = null;

    // 使用一个大的 viewBox 以便为圆角连接提供充足的渲染空间，防止被裁剪。
    const size = 40;
    const strokeWidth = 3; // 使用一个较大的描边宽度以使圆角效果明显。
    marker.setAttribute('viewBox', `0 0 ${size} ${size}`);
    
    // 三角形几何形状，在 viewBox 中居中。
    const altitude = 15;
    const halfBase = 8.66;
    const centerY = size / 2;
    const y1 = centerY - halfBase;
    const y2 = centerY + halfBase;

    // 定义远离边缘的坐标以防止裁剪。
    const edgeBuffer = 5;
    const x_tip_right = size - edgeBuffer;
    const x_base_right = x_tip_right - altitude;
    const x_tip_left = edgeBuffer;
    const x_base_left = x_tip_left + altitude;

    // 与三角类形状保持视觉一致性的目标尺寸
    const targetDim = 17;
    const halfDim = targetDim / 2;
    const centerXY = size / 2;
    const shapeEdgeBuffer = centerXY - halfDim;
    
    // 根据用户设置缩放标记尺寸
    marker.setAttribute('markerWidth', `${8 * endpointSize}`);
    marker.setAttribute('markerHeight', `${8 * endpointSize}`);

    switch (type) {
        case 'arrow': // > 形，开放，连接到尖端
            marker.setAttribute('refX', `${x_tip_right}`);
            marker.setAttribute('refY', `${centerY}`);
            shape = document.createElementNS(svgNS, 'path');
            shape.setAttribute('d', `M ${x_base_right} ${y1} L ${x_tip_right} ${centerY} L ${x_base_right} ${y2}`);
            break;
        case 'reverse_arrow': // < 形 (分叉)，开放，连接到尖端
            marker.setAttribute('refX', `${x_tip_left}`);
            marker.setAttribute('refY', `${centerY}`);
            shape = document.createElementNS(svgNS, 'path');
            shape.setAttribute('d', `M ${x_base_left} ${y1} L ${x_tip_left} ${centerY} L ${x_base_left} ${y2}`);
            break;
        case 'triangle': // > 形，闭合，连接到底部
            marker.setAttribute('refX', `${x_base_right}`);
            marker.setAttribute('refY', `${centerY}`);
            shape = document.createElementNS(svgNS, 'path');
            shape.setAttribute('d', `M ${x_tip_right} ${centerY} L ${x_base_right} ${y1} L ${x_base_right} ${y2} z`);
            break;
        case 'dot': // < 形 (倒三角)，闭合，连接到尖端
            marker.setAttribute('refX', `${x_tip_left}`);
            marker.setAttribute('refY', `${centerY}`);
            shape = document.createElementNS(svgNS, 'path');
            shape.setAttribute('d', `M ${x_base_left} ${y1} L ${x_tip_left} ${centerY} L ${x_base_left} ${y2} z`);
            break;
        case 'circle':
            marker.setAttribute('refX', `${shapeEdgeBuffer}`);
            marker.setAttribute('refY', `${centerXY}`);
            shape = document.createElementNS(svgNS, 'circle');
            shape.setAttribute('cx', `${centerXY}`);
            shape.setAttribute('cy', `${centerXY}`);
            shape.setAttribute('r', `${halfDim}`);
            break;
        case 'square':
            marker.setAttribute('refX', `${shapeEdgeBuffer}`);
            marker.setAttribute('refY', `${centerXY}`);
            shape = document.createElementNS(svgNS, 'rect');
            shape.setAttribute('x', `${shapeEdgeBuffer}`);
            shape.setAttribute('y', `${shapeEdgeBuffer}`);
            shape.setAttribute('width', `${targetDim}`);
            shape.setAttribute('height', `${targetDim}`);
            shape.setAttribute('rx', `${strokeWidth}`); // 显式设置圆角
            break;
        case 'diamond':
            marker.setAttribute('refX', `${shapeEdgeBuffer}`);
            marker.setAttribute('refY', `${centerXY}`);
            shape = document.createElementNS(svgNS, 'path');
            const d = `M ${shapeEdgeBuffer} ${centerXY} L ${centerXY} ${shapeEdgeBuffer} L ${size - shapeEdgeBuffer} ${centerXY} L ${centerXY} ${size - shapeEdgeBuffer} z`;
            shape.setAttribute('d', d);
            break;
        case 'bar':
            marker.setAttribute('refX', `${centerXY}`);
            marker.setAttribute('refY', `${centerXY}`);
            shape = document.createElementNS(svgNS, 'line');
            shape.setAttribute('x1', `${centerXY}`);
            shape.setAttribute('y1', `${shapeEdgeBuffer}`);
            shape.setAttribute('x2', `${centerXY}`);
            shape.setAttribute('y2', `${size - shapeEdgeBuffer}`);
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
        
        if (isTrueCap) {
            shape.setAttribute('fill', color);
            shape.setAttribute('stroke', 'none');
        } else {
            shape.setAttribute('stroke', color);
            shape.setAttribute('stroke-width', `${strokeWidth}`);
            shape.setAttribute('stroke-linecap', 'round');
            shape.setAttribute('stroke-linejoin', 'round');
            
            if (isFillable) {
                shape.setAttribute('fill', useSolidFill ? color : 'transparent');
            } else { // isLine
                shape.setAttribute('fill', 'none');
            }
        }
        marker.appendChild(shape);
    }
    
    return marker;
}