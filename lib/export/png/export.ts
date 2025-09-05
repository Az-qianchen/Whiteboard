/**
 * 本文件负责将路径数据导出为 PNG 格式。
 * 它首先将路径渲染为 SVG 字符串，然后使用 Canvas API 将 SVG 转换为 PNG Blob。
 */
import pica from 'pica';
import type { AnyPath, PngExportOptions, BBox, FrameData } from '../../types';
import { getPathsBoundingBox } from '../../drawing';
import { pathsToSvgString } from '../svg/export';

// FIX: Explicitly define all properties instead of extending PngExportOptions
// to avoid TypeScript resolution issues in some environments.
interface PngExportCoreOptions {
  backgroundColor: string;
  scale: number;
  highQuality: boolean;
  transparentBg: boolean;
  overrideBbox?: BBox;
  clipFrame?: FrameData;
  // FIX: Add the missing 'padding' property to fix a TypeScript error.
  padding?: number;
}

/**
 * 从路径数据数组创建一个 PNG Blob。
 * @param paths 要渲染的路径数组。
 * @param options 导出的配置。
 * @returns 一个解析为 Blob 或 null 的 Promise。
 */
export function pathsToPngBlob(paths: AnyPath[], options: PngExportCoreOptions): Promise<Blob | null> {
    const { backgroundColor, scale, highQuality, clipFrame } = options;
    const PICA_INTERNAL_SCALE_FACTOR = 2; // Render at 2x the final size for high quality downscaling

    return new Promise(async (resolve) => {
        let bbox = options.overrideBbox;
        let padding = options?.padding ?? 20;
        let bboxWidthWithPadding: number;
        let bboxHeightWithPadding: number;

        if (clipFrame) {
            // When clipping to a frame, the export dimensions are the frame's dimensions.
            bboxWidthWithPadding = clipFrame.width;
            bboxHeightWithPadding = clipFrame.height;
            padding = 0; // The frame is the boundary, no extra padding needed.
        } else {
            if (!bbox) {
                bbox = getPathsBoundingBox(paths, true);
            }
            if (!bbox) {
                console.error("Could not get bounding box for PNG export.");
                return resolve(null);
            }
            bboxWidthWithPadding = bbox.width + padding * 2;
            bboxHeightWithPadding = bbox.height + padding * 2;
        }

        const finalWidth = Math.round(bboxWidthWithPadding * scale);
        const finalHeight = Math.round(bboxHeightWithPadding * scale);
        
        const renderScale = highQuality ? scale * PICA_INTERNAL_SCALE_FACTOR : scale;
        const renderWidth = Math.round(bboxWidthWithPadding * renderScale);
        const renderHeight = Math.round(bboxHeightWithPadding * renderScale);

        const svgString = await pathsToSvgString(paths, {
            padding,
            width: renderWidth,
            height: renderHeight,
            optimize: false, // Must be false for visual fidelity
            clipFrame,
        });

        if (!svgString) {
            console.error("Failed to generate SVG string for PNG export.");
            return resolve(null);
        }

        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = renderWidth;
        sourceCanvas.height = renderHeight;
        const sourceCtx = sourceCanvas.getContext('2d');
        if (!sourceCtx) {
            console.error("Could not get 2D context for canvas.");
            return resolve(null);
        }

        if (backgroundColor && backgroundColor !== 'transparent') {
            sourceCtx.fillStyle = backgroundColor;
            sourceCtx.fillRect(0, 0, renderWidth, renderHeight);
        }

        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = async () => {
            sourceCtx.drawImage(img, 0, 0, renderWidth, renderHeight);
            URL.revokeObjectURL(url);

            if (highQuality && renderScale > scale) {
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = finalWidth;
                finalCanvas.height = finalHeight;
                try {
                    const p = pica();
                    const resizedCanvas = await p.resize(sourceCanvas, finalCanvas);
                    resizedCanvas.toBlob(resolve, 'image/png');
                } catch (err) {
                    console.error("Pica resizing failed, falling back to native scaling.", err);
                    sourceCanvas.toBlob(resolve, 'image/png');
                }
            } else {
                sourceCanvas.toBlob(resolve, 'image/png');
            }
        };

        img.onerror = (err) => {
            console.error("Failed to load SVG image for PNG conversion:", err);
            URL.revokeObjectURL(url);
            resolve(null);
        };
        img.src = url;
    });
}
