/**
 * 本文件定义了侧边工具栏面板组件。
 * 它包含侧边工具栏及其折叠/展开按钮。
 */
import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { SideToolbar } from '../SideToolbar';
import { ICONS, CONTROL_BUTTON_CLASS, TIMELINE_PANEL_HEIGHT_VAR } from '@/constants';
import PanelButton from '@/components/PanelButton';
import { useTranslation } from 'react-i18next';

/**
 * 侧边工具栏面板组件
 */
export const SideToolbarPanel: React.FC = () => {
    const store = useAppContext();
    const { isSideToolbarCollapsed, setIsSideToolbarCollapsed, handleToggleStyleLibrary } = store;
    const { t } = useTranslation();
    
    return (
        <>
        <div className="absolute top-4 right-4 z-30">
            <PanelButton
                onClick={() => setIsSideToolbarCollapsed(prev => !prev)}
                variant="unstyled"
                className={CONTROL_BUTTON_CLASS}
                title={isSideToolbarCollapsed ? t('layout.expandToolbar') : t('layout.collapseToolbar')}
            >
                <div className={`transition-transform duration-300 ${isSideToolbarCollapsed ? '' : 'rotate-180'}`}>{ICONS.CHEVRON_LEFT}</div>
            </PanelButton>
        </div>

            <div 
                className={`absolute right-4 z-20 transition-all duration-300 ease-in-out`}
                style={{
                    top: `calc(50% - (${TIMELINE_PANEL_HEIGHT_VAR}) / 2)`,
                    transform: `translateY(-50%) ${isSideToolbarCollapsed ? 'translateX(calc(100% + 1rem))' : 'translateX(0)'}`,
                }}
            >
                <SideToolbar {...store} onToggleStyleLibrary={handleToggleStyleLibrary} />
            </div>
        </>
    );
};
