/**
 * 覆盖 text 布局工具的关键边界：长单词拆分、多字节字符换行与换行符归一化。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { layoutText, sanitizeText, MIN_TEXT_WIDTH } from '@/lib/text';

let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

describe('layoutText', () => {
  beforeAll(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext() {
      return {
        font: '',
        measureText: (text: string) => ({ width: text.length * 10 }),
      } as unknown as CanvasRenderingContext2D;
    };
  });

  afterAll(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('expands width when a token exceeds the available width', () => {
    const result = layoutText({
      text: 'supercalifragilisticexpialidocious',
      width: 30,
      fontFamily: 'sans-serif',
      fontSize: 12,
      lineHeight: 1.2,
    });

    expect(result.lines).toHaveLength(1);
    const measuredWidth = result.lines[0].length * 10;
    expect(result.width).toBeGreaterThanOrEqual(Math.max(MIN_TEXT_WIDTH, 30));
    expect(result.width).toBeGreaterThanOrEqual(measuredWidth);
  });

  it('preserves empty lines and multi-byte characters', () => {
    const result = layoutText({
      text: '第一行\n\n第二段包含多字节字符',
      width: 120,
      fontFamily: 'sans-serif',
      fontSize: 16,
      lineHeight: 1.4,
    });

    expect(result.lines).toContain('');
    expect(result.lines[0]).toBe('第一行');
    expect(result.lines[result.lines.length - 1]).toBe('第二段包含多字节字符');
    expect(result.height).toBeGreaterThanOrEqual(result.lines.length * 16 * 1.4);
  });
});

describe('sanitizeText', () => {
  it('normalizes Windows line endings to Unix style', () => {
    expect(sanitizeText('Hello\r\nWorld\r'))
      .toBe('Hello\nWorld\n');
  });
});
