/**
 * 本文件定义了侧边工具栏面板组件。
 * 它包含侧边工具栏及其折叠/展开按钮。
 */
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { SideToolbar } from '../SideToolbar';
import { ICONS } from '../../constants';
import PanelButton from '@/components/PanelButton';

export const SideToolbarPanel: React.FC = () => {
    const store = useAppContext();
    const { isSideToolbarCollapsed, setIsSideToolbarCollapsed, handleToggleStyleLibrary, isTimelineCollapsed, handleAdjustImageHsv } = store;
    
    return (
        <>
            <PanelButton
                variant="unstyled"
                onClick={() => setIsSideToolbarCollapsed(prev => !prev)}
                className="absolute top-4 right-4 z-30 flex items-center justify-center h-[34px] w-[34px] rounded-lg transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
                title={isSideToolbarCollapsed ? '展开工具栏' : '折叠工具栏'}
            >
                <div className={`transition-transform duration-300 ${isSideToolbarCollapsed ? '' : 'rotate-180'}`}>{ICONS.CHEVRON_LEFT}</div>
            </PanelButton>

            <div 
                className={`absolute right-4 z-20 transition-all duration-300 ease-in-out`}
                style={{
                    top: isTimelineCollapsed ? '50%' : 'calc(50% - 6rem)',
                    transform: `translateY(-50%) ${isSideToolbarCollapsed ? 'translateX(calc(100% + 1rem))' : 'translateX(0)'}`,
                }}
            >
                <SideToolbar {...store} onToggleStyleLibrary={handleToggleStyleLibrary} onAdjustImageHsv={handleAdjustImageHsv} />
            </div>
        </>
    );
};