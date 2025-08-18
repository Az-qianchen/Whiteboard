

import type { AnyPath } from '../../types';
import rough from 'roughjs/bin/rough';
import { getPathsBoundingBox } from '../../drawing';
import { renderPathNode } from '../core/render';
import { optimize } from 'svgo';

/**
 * Creates an SVG string from an array of path data, with an option to optimize it using SVGO.
 * @param paths - The array of paths to include in the SVG.
 * @returns An optimized SVG string, or null if no paths are provided.
 */
export function pathsToSvgString(paths: AnyPath[]): string | null {
  if (paths.length === 0) return null;

  const bbox = getPathsBoundingBox(paths, true);
  if (!bbox) return null;

  const padding = 20;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('xmlns', svgNS);
  svg.setAttribute('width', String(bbox.width + padding * 2));
  svg.setAttribute('height', String(bbox.height + padding * 2));
  svg.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`);

  const rc = rough.svg(svg);

  paths.forEach(pathData => {
    const node = renderPathNode(rc, pathData);
    if (node) {
      svg.appendChild(node);
    }
  });

  const rawSvgString = new XMLSerializer().serializeToString(svg);

  // --- NEW OPTIMIZATION STEP ---
  try {
    const { data } = optimize(rawSvgString, {
      multipass: true,
      plugins: [
        {
          name: 'preset-default',
          params: {
            overrides: {
              // Our app uses images, so we should not remove them.
              removeRasterImages: false,
              // Keep the viewBox because it's critical for scaling and positioning.
              removeViewBox: false,
            },
          },
        } as any, // Use type assertion to bypass incorrect SVGO type definitions
        // Explicitly enable removeDimensions for better scalability of the exported SVG.
        'removeDimensions',
      ],
    });
    return data;
  } catch (error) {
    console.error("SVGO optimization failed:", error);
    // Fallback to the unoptimized version if SVGO fails.
    return rawSvgString;
  }
}
