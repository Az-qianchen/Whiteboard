import { hslaToHex, parseColor } from '@/lib/color';

const paintOpacityAttributes: Record<'stroke' | 'fill' | 'stop-color', 'stroke-opacity' | 'fill-opacity' | 'stop-opacity'> = {
  stroke: 'stroke-opacity',
  fill: 'fill-opacity',
  'stop-color': 'stop-opacity',
};

const stylePaintProperties = new Set([
  'stroke',
  'fill',
  'stroke-opacity',
  'fill-opacity',
  'stop-color',
  'stop-opacity',
]);

const formatOpacity = (value: number): string => {
  if (value <= 0) return '0';
  if (value >= 1) return '1';
  const fixed = value.toFixed(4);
  return fixed.replace(/0+$/, '').replace(/\.$/, '') || '0';
};

const shouldBypassNormalization = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  return trimmed.startsWith('url(') || lower === 'currentcolor' || lower === 'inherit';
};

const applyTransparentPaint = (element: SVGElement, attribute: 'stroke' | 'fill' | 'stop-color'): void => {
  const opacityAttr = paintOpacityAttributes[attribute];
  if (attribute === 'stop-color') {
    element.setAttribute(attribute, '#000000');
  } else {
    element.setAttribute(attribute, 'none');
  }
  element.setAttribute(opacityAttr, '0');
};

const normalizePaintValue = (element: SVGElement, attribute: 'stroke' | 'fill' | 'stop-color', rawValue: string): void => {
  const value = rawValue.trim();
  if (!value) return;

  const lower = value.toLowerCase();
  if (lower === 'none') {
    if (attribute === 'stop-color') {
      element.removeAttribute(attribute);
    } else {
      element.setAttribute(attribute, 'none');
    }
    element.removeAttribute(paintOpacityAttributes[attribute]);
    return;
  }

  if (lower === 'transparent') {
    applyTransparentPaint(element, attribute);
    return;
  }

  if (shouldBypassNormalization(value)) {
    element.setAttribute(attribute, value);
    if (attribute !== 'stop-color') {
      element.removeAttribute(paintOpacityAttributes[attribute]);
    }
    return;
  }

  const hsla = parseColor(value);
  const hex = hslaToHex({ ...hsla, a: 1 });
  element.setAttribute(attribute, hex);

  const opacityAttr = paintOpacityAttributes[attribute];
  if (hsla.a < 1) {
    element.setAttribute(opacityAttr, formatOpacity(hsla.a));
  } else {
    element.removeAttribute(opacityAttr);
  }
};

const transferPaintDeclarationsFromStyle = (element: SVGElement): void => {
  const style = element.getAttribute('style');
  if (!style) return;

  const declarations = style
    .split(';')
    .map(part => part.trim())
    .filter(Boolean);

  if (declarations.length === 0) {
    element.removeAttribute('style');
    return;
  }

  const retained: string[] = [];

  declarations.forEach(decl => {
    const [property, ...valueParts] = decl.split(':');
    if (!property || valueParts.length === 0) return;

    const propName = property.trim();
    const propValue = valueParts.join(':').trim();

    if (!stylePaintProperties.has(propName)) {
      retained.push(`${propName}: ${propValue}`);
      return;
    }

    switch (propName) {
      case 'stroke':
      case 'fill':
        element.setAttribute(propName, propValue);
        break;
      case 'stop-color':
        element.setAttribute('stop-color', propValue);
        break;
      case 'stroke-opacity':
      case 'fill-opacity':
      case 'stop-opacity':
        element.setAttribute(propName, propValue);
        break;
      default:
        retained.push(`${propName}: ${propValue}`);
        break;
    }
  });

  if (retained.length > 0) {
    element.setAttribute('style', retained.join('; '));
  } else {
    element.removeAttribute('style');
  }
};

export const normalizePaintAttributes = (element: SVGElement): void => {
  transferPaintDeclarationsFromStyle(element);

  const stroke = element.getAttribute('stroke');
  if (stroke) {
    normalizePaintValue(element, 'stroke', stroke);
  }

  const fill = element.getAttribute('fill');
  if (fill) {
    normalizePaintValue(element, 'fill', fill);
  }

  if (element.tagName.toLowerCase() === 'stop') {
    const stopColor = element.getAttribute('stop-color');
    if (stopColor) {
      normalizePaintValue(element, 'stop-color', stopColor);
    }
  }

  element.childNodes.forEach(child => {
    if (child instanceof SVGElement) {
      normalizePaintAttributes(child);
    }
  });
};
