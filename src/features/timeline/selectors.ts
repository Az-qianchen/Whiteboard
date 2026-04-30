import type { AnyPath, Frame, GroupData } from '@/types';

export type OnionSkinOptions = {
  isOnionSkinEnabled: boolean;
  frames: Frame[];
  currentFrameIndex: number;
  onionSkinPrevFrames: number;
  onionSkinNextFrames: number;
  onionSkinOpacity: number;
};

const clonePathForOnionSkin = (path: AnyPath, prefix: string, opacityFactor: number): AnyPath => {
  const baseOpacity = path.opacity ?? 1;
  const cloned = {
    ...path,
    id: `${prefix}${path.id}`,
    opacity: baseOpacity * opacityFactor,
    isLocked: true,
  } as AnyPath;

  if (path.tool === 'group') {
    const group = path as GroupData;
    return {
      ...(cloned as GroupData),
      children: group.children.map(child => clonePathForOnionSkin(child, prefix, opacityFactor)),
    };
  }

  return cloned;
};

export const selectOnionSkinPaths = ({
  isOnionSkinEnabled,
  frames,
  currentFrameIndex,
  onionSkinPrevFrames,
  onionSkinNextFrames,
  onionSkinOpacity,
}: OnionSkinOptions): AnyPath[] => {
  if (!isOnionSkinEnabled || frames.length <= 1) {
    return [];
  }

  const skinPaths: AnyPath[] = [];
  const maxOpacity = onionSkinOpacity;

  for (let i = 1; i <= onionSkinPrevFrames; i++) {
    const frameIndex = currentFrameIndex - i;
    if (frameIndex < 0) break;
    const opacity = maxOpacity * ((onionSkinPrevFrames - i + 1) / (onionSkinPrevFrames + 1));
    const framePaths = frames[frameIndex].paths
      .filter(p => p.isVisible !== false)
      .map(p => clonePathForOnionSkin(p, `onion-prev-${i}-`, opacity));
    skinPaths.push(...framePaths);
  }

  for (let i = 1; i <= onionSkinNextFrames; i++) {
    const frameIndex = currentFrameIndex + i;
    if (frameIndex >= frames.length) break;
    const opacity = maxOpacity * ((onionSkinNextFrames - i + 1) / (onionSkinNextFrames + 1));
    const framePaths = frames[frameIndex].paths
      .filter(p => p.isVisible !== false)
      .map(p => clonePathForOnionSkin(p, `onion-next-${i}-`, opacity));
    skinPaths.push(...framePaths);
  }

  return skinPaths;
};
