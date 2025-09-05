/**
 * 本文件包含了与文本测量和处理相关的函数。
 */

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d')!;

/**
 * 使用 2D 画布上下文测量给定文本的尺寸。
 * @param text - 要测量的文本字符串。
 * @param fontSize - 字体大小（像素）。
 * @param fontFamily - 字体系列。
 * @returns 包含宽度和高度的对象。
 */
export function measureText(text: string, fontSize: number, fontFamily: string): { width: number, height: number } {
    ctx.font = `${fontSize}px ${fontFamily}`;
    const lines = text.split('\n');
    let maxWidth = 0;
    
    // 测量宽度
    for (const line of lines) {
        const metrics = ctx.measureText(line);
        if (metrics.width > maxWidth) {
            maxWidth = metrics.width;
        }
    }
    
    // 高度是根据字体大小、行数和行高乘数估算的
    // 对于 Excalifont，1.25 是一个合适的行高
    const lineHeight = fontSize * 1.25;
    const height = lines.length * lineHeight;

    return { width: maxWidth, height };
}
