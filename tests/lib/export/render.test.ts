// 测试 renderPathNode 在导出图像时的矩阵组合顺序
import { describe, it, expect, vi } from 'vitest';
vi.mock('paper', () => ({}));
import { renderPathNode } from '@/lib/export/core/render';
import type { ImageData } from '@/types';
import {
  createTranslationMatrix,
  createRotationMatrix,
  createScaleMatrix,
  multiplyMatrices,
  matrixToString,
} from '@/lib/drawing/transform/matrix';

describe('renderPathNode transform order', () => {
  it('applies scale before rotation for flipped images', () => {
    const data: ImageData = {
      id: 'img',
      tool: 'image',
      src: '',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: Math.PI / 4,
      scaleX: -1,
      scaleY: 1,
      color: '',
      fill: '',
      fillStyle: '',
      strokeWidth: 0,
      roughness: 0,
      bowing: 0,
      fillWeight: 0,
      hachureAngle: 0,
      hachureGap: 0,
      curveTightness: 0,
      curveStepCount: 9,
    };
    const node = renderPathNode({} as any, data)!;
    let expectedMatrix = createTranslationMatrix(50, 50);
    expectedMatrix = multiplyMatrices(expectedMatrix, createRotationMatrix(Math.PI / 4));
    expectedMatrix = multiplyMatrices(expectedMatrix, createScaleMatrix(-1, 1));
    expectedMatrix = multiplyMatrices(expectedMatrix, createTranslationMatrix(-50, -50));
    expect(node.getAttribute('transform')).toBe(matrixToString(expectedMatrix));
  });
});
