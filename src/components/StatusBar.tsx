/**
 * 本文件定义了应用底部的状态栏组件。
 * 它显示当前的缩放级别，并提供画布信息。
 */

import React from 'react';
import { ICONS } from '../constants';
import PanelButton from '@/components/PanelButton';
import { useTranslation } from 'react-i18next';

interface StatusBarProps {
  zoomLevel: number;
  selectionInfo: {
    type: 'single' | 'single-bbox' | 'multiple';
    x?: number;
    y?: number;
    width: number;
    height: number;
    rotation?: number;
    count?: number;
  } | null;
  elementCount: number;
  canvasWidth: number;
  canvasHeight: number;
  isStatusBarCollapsed: boolean;
  setIsStatusBarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  zoomLevel,
  selectionInfo,
  elementCount,
  canvasWidth,
  canvasHeight,
  isStatusBarCollapsed,
  setIsStatusBarCollapsed,
}) => {
  const { t } = useTranslation();
  return (
    <div className="w-full bg-[var(--ui-element-bg)] rounded-lg p-2 text-[var(--text-primary)] text-sm">
      <div className="flex items-center justify-between h-8 text-xs text-[var(--text-secondary)] whitespace-nowrap">
        <span>{t('canvas')}</span>
        <PanelButton
          variant="unstyled"
          onClick={() => setIsStatusBarCollapsed(prev => !prev)}
          title={isStatusBarCollapsed ? t('expandInfo') : t('collapseInfo')}
          className="p-1 rounded-md flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--ui-element-bg-hover)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
        >
          <div className={`transition-transform duration-300 ease-in-out ${isStatusBarCollapsed ? 'rotate-180' : ''}`}>
            {ICONS.CHEVRON_DOWN}
          </div>
        </PanelButton>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isStatusBarCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
        }`}
      >
        <div
          className={`overflow-hidden divide-y divide-[var(--ui-separator)] transition-[padding,opacity] duration-300 ${
            isStatusBarCollapsed ? 'pt-0 opacity-0' : 'pt-2 opacity-100'
          }`}
        >
          <div className="pb-2 text-xs text-[var(--text-secondary)] whitespace-nowrap overflow-hidden">
            <div className="text-center bg-black/20 rounded-md p-2 space-y-1">
              <div className="flex justify-between">
                <span>{t('elements')}: {elementCount}</span>
                <span>{t('zoom')}: {Math.round(zoomLevel * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span>W: {canvasWidth}</span>
                <span>H: {canvasHeight}</span>
              </div>
            </div>
          </div>

          {selectionInfo && (
            <div className="pt-2 text-xs text-[var(--text-secondary)] whitespace-nowrap overflow-hidden">
              <span className="block mb-1">{t('selection')}</span>
              <div className="text-center bg-black/20 rounded-md p-2 space-y-1">
                <div className="flex justify-between">
                  <span>{t('elements')}: {selectionInfo.count ?? 1}</span>
                  {selectionInfo.rotation !== undefined && (
                    <span>R: {selectionInfo.rotation}°</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span>W: {selectionInfo.width}</span>
                  <span>H: {selectionInfo.height}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};