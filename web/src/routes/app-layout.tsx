import { Outlet } from 'react-router-dom';

import { MobileTabBar } from '@/components/layout/mobile-tab-bar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[#f8f6f6] dark:bg-[#221610]">
      <Outlet />
      <MobileTabBar />
    </div>
  );
}
