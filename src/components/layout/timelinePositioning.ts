/**
 * 工具函数：根据时间线面板的展开状态计算覆盖层控件的底部偏移量。
 * 这保证了按钮和工具栏在时间线展开时会自动上移，折叠时则贴近底边，
 * 同时兼顾移动端的安全区（safe area）。
 */

const TIMELINE_PANEL_HEIGHT = '12rem';
const TIMELINE_OVERLAY_GAP = '1rem';
const TIMELINE_SAFE_AREA_INSET_BOTTOM = 'env(safe-area-inset-bottom, 0px)';

const ZERO_OFFSETS = new Set(['0', '0px', '0rem', '0em', '0%']);

const isZeroOffset = (value: string) => {
  if (ZERO_OFFSETS.has(value)) {
    return true;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed === 0;
};

export function getTimelineOverlayBottomOffset(
  isTimelineCollapsed: boolean,
  extraOffset: string = '0rem',
): string {
  const normalizedOffset = extraOffset.trim();
  const segments: string[] = [TIMELINE_SAFE_AREA_INSET_BOTTOM];

  if (!isTimelineCollapsed) {
    segments.push(TIMELINE_PANEL_HEIGHT, TIMELINE_OVERLAY_GAP);
  }

  if (normalizedOffset && !isZeroOffset(normalizedOffset)) {
    segments.push(normalizedOffset);
  }

  if (segments.length === 1) {
    return segments[0];
  }

  return `calc(${segments.join(' + ')})`;
}
