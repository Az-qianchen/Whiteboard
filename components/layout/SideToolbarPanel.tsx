/**
 * 本文件定义了侧边工具栏面板组件。
 * 它包含侧边工具栏及其折叠/展开按钮。
 */
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { SideToolbar } from '../SideToolbar';
import { ICONS } from '../../constants';

export const SideToolbarPanel: React.FC = () => {
    const store = useAppContext();
    const { isSideToolbarCollapsed, setIsSideToolbarCollapsed, handleToggleStyleLibrary, isTimelineCollapsed } = store;
    
    return (
        <>
            <button onClick={() => setIsSideToolbarCollapsed(prev => !prev)}
                className="absolute top-4 right-4 z-30 h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-lg border border-[var(--ui-panel-border)] text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                title={isSideToolbarCollapsed ? '展开工具栏' : '折叠工具栏'}>
                <div className={`transition-transform duration-300 ${isSideToolbarCollapsed ? '' : 'rotate-180'}`}>{ICONS.CHEVRON_LEFT}</div>
            </button>

            <div 
                className={`absolute right-4 z-20 transition-all duration-300 ease-in-out`}
                style={{
                    top: isTimelineCollapsed ? '50%' : 'calc(50% - 6rem)',
                    transform: `translateY(-50%) ${isSideToolbarCollapsed ? 'translateX(calc(100% + 1rem))' : 'translateX(0)'}`,
                }}
            >
                <SideToolbar {...store} onToggleStyleLibrary={handleToggleStyleLibrary} />
            </div>
        </>
    );
};