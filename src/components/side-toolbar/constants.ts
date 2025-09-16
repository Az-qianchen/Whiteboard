import React from 'react';
import { ICONS } from '@/constants';
import type { EndpointStyle } from '@/types';

export const FILL_STYLE_ICONS = {
  solid: React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 20 20", className: "w-5 h-5", fill: "currentColor" },
    React.createElement("rect", { x: "2", y: "2", width: "16", height: "16" })
  ),
  hachure: React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 20 20", className: "w-5 h-5", fill: "none", stroke: "currentColor", strokeWidth: "1.5" },
    React.createElement("path", { d: "M 3 17 L 17 3 M 3 12 L 12 3 M 3 7 L 7 3 M 8 17 L 17 8 M 13 17 L 17 13" }),
    React.createElement("rect", { x: "2", y: "2", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1" })
  ),
  'cross-hatch': React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 20 20", className: "w-5 h-5", fill: "none", stroke: "currentColor", strokeWidth: "1.5" },
    React.createElement("path", { d: "M 5 0 V 20 M 10 0 V 20 M 15 0 V 20 M 0 5 H 20 M 0 10 H 20 M 0 15 H 20", strokeWidth: "1" }),
    React.createElement("rect", { x: "2", y: "2", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1" })
  ),
  dots: React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 20 20", className: "w-5 h-5", fill: "currentColor" },
    React.createElement("circle", { cx: "6", cy: "6", r: "1.2" }),
    React.createElement("circle", { cx: "14", cy: "6", r: "1.2" }),
    React.createElement("circle", { cx: "6", cy: "14", r: "1.2" }),
    React.createElement("circle", { cx: "14", cy: "14", r: "1.2" }),
    React.createElement("rect", { x: "2", y: "2", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1" })
  ),
  dashed: React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 20 20", className: "w-5 h-5", fill: "none", stroke: "currentColor", strokeWidth: "1.5" },
    React.createElement("path", { d: "M 4 5 H 8 M 12 5 H 16 M 4 10 H 8 M 12 10 H 16 M 4 15 H 8 M 12 15 H 16" }),
    React.createElement("rect", { x: "2", y: "2", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1" })
  ),
  zigzag: React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 20 20", className: "w-5 h-5", fill: "none", stroke: "currentColor", strokeWidth: "1" },
    React.createElement("path", { d: "M 3 4 L 7 8 L 3 12 L 7 16 M 8 4 L 12 8 L 8 12 L 12 16 M 13 4 L 17 8 L 13 12 L 17 16" }),
    React.createElement("rect", { x: "2", y: "2", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1" })
  ),
  'zigzag-line': React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 20 20", className: "w-5 h-5", fill: "none", stroke: "currentColor", strokeWidth: "1" },
    React.createElement("path", { d: "M 2 5 L 6 2 L 10 5 L 14 2 L 18 5 M 2 10 L 6 7 L 10 10 L 14 7 L 18 10 M 2 15 L 6 12 L 10 15 L 14 12 L 18 15" }),
    React.createElement("rect", { x: "2", y: "2", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1" })
  ),
};

export const FILL_STYLES = [
  { name: 'solid', titleKey: 'sideToolbar.fillStyle.options.solid', icon: FILL_STYLE_ICONS.solid },
  { name: 'hachure', titleKey: 'sideToolbar.fillStyle.options.hachure', icon: FILL_STYLE_ICONS.hachure },
  { name: 'cross-hatch', titleKey: 'sideToolbar.fillStyle.options.cross-hatch', icon: FILL_STYLE_ICONS['cross-hatch'] },
  { name: 'dots', titleKey: 'sideToolbar.fillStyle.options.dots', icon: FILL_STYLE_ICONS.dots },
  { name: 'dashed', titleKey: 'sideToolbar.fillStyle.options.dashed', icon: FILL_STYLE_ICONS.dashed },
  { name: 'zigzag', titleKey: 'sideToolbar.fillStyle.options.zigzag', icon: FILL_STYLE_ICONS.zigzag },
  { name: 'zigzag-line', titleKey: 'sideToolbar.fillStyle.options.zigzag-line', icon: FILL_STYLE_ICONS['zigzag-line'] },
] as const;

export const ENDPOINT_FILL_STYLES: { name: 'hollow' | 'solid'; titleKey: string; icon: JSX.Element }[] = [
  { name: 'hollow', titleKey: 'sideToolbar.strokeStyle.fillOptions.hollow', icon: ICONS.ENDPOINT_FILL_HOLLOW },
  { name: 'solid', titleKey: 'sideToolbar.strokeStyle.fillOptions.solid', icon: ICONS.ENDPOINT_FILL_SOLID },
];