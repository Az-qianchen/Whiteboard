/**
 * 本文件定义了“关于”按钮及其弹出菜单组件。
 * 它提供了应用相关信息的链接。
 */
import React, { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import PanelButton from '@/components/PanelButton';
import { CONTROL_BUTTON_CLASS, getTimelinePanelBottomOffset } from '@/constants';
import { useAppContext } from '@/context/AppContext';

const links = [
  { name: 'vtracer - PNG转矢量工具', href: 'https://www.visioncortex.org/vtracer/' },
  { name: '作者官网 - tuclink.com', href: 'https://tuclink.com/' },
];

/**
 * 关于按钮组件
 */
export const AboutButton: React.FC = () => {
  const { isTimelineCollapsed } = useAppContext();

  return (
    <div
      className="absolute right-4 z-30 transition-all duration-300 ease-in-out"
      style={{ bottom: getTimelinePanelBottomOffset(isTimelineCollapsed) }}
    >
        <Popover className="relative">
          <Popover.Button
            as={PanelButton}
            variant="unstyled"
            title="关于"
            className={CONTROL_BUTTON_CLASS}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Popover.Panel className="absolute bottom-full right-0 mb-3 w-64 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] p-2">
              <div className="flex flex-col gap-1">
                {links.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 rounded-md text-sm text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)]"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            </Popover.Panel>
          </Transition>
        </Popover>
    </div>
  );
};
