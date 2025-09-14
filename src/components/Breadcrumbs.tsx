/**
 * 本文件定义了面包屑导航组件。
 * 当用户进入组编辑模式时，它会显示当前的编辑路径。
 */

import React from 'react';
import type { AnyPath } from '../types';
import PanelButton from '@/components/PanelButton';

interface BreadcrumbsProps {
  path: AnyPath[];
  onJumpTo: (index: number) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ path, onJumpTo }) => {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl p-2 text-[var(--text-primary)]">
      <PanelButton
        variant="unstyled"
        onClick={() => onJumpTo(-1)}
        className="px-2 py-1 rounded-md hover:bg-[var(--ui-hover-bg)] transition-colors"
      >
        根
      </PanelButton>
      {path.map((group, index) => (
        <React.Fragment key={group.id}>
          <span className="text-[var(--text-secondary)]">/</span>
          <PanelButton
            variant="unstyled"
            onClick={() => onJumpTo(index)}
            className="px-2 py-1 rounded-md hover:bg-[var(--ui-hover-bg)] transition-colors truncate max-w-xs"
            title={group.name || '编组'}
          >
            {group.name || '编组'}
          </PanelButton>
        </React.Fragment>
      ))}
    </nav>
  );
};
