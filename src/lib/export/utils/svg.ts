const geometryTags = new Set([
  'path',
  'line',
  'polyline',
  'polygon',
  'rect',
  'circle',
  'ellipse'
]);

const hasVisibleStroke = (element: SVGElement): boolean => {
  const stroke = element.getAttribute('stroke');
  return !!stroke && stroke !== 'none' && stroke !== 'transparent';
};

export const applyNonScalingStroke = (element: SVGElement): void => {
  if (element.tagName === 'defs') return;

  if (geometryTags.has(element.tagName.toLowerCase()) && hasVisibleStroke(element)) {
    element.setAttribute('vector-effect', 'non-scaling-stroke');
  }

  element.childNodes.forEach((child) => {
    if (child instanceof SVGElement) {
      applyNonScalingStroke(child);
    }
  });
};
