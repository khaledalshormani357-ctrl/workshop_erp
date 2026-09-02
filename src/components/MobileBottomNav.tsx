import React from 'react';
import { useERP, ActiveTab } from '../context/ERPContext';
import {
  LayoutDashboard,
  Hammer,
  Receipt,
  Boxes,
  Menu
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMobileMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMobileMenu }) => {
  const { lang, activeTab, setActiveTab } = useERP();

  const mainTabs: { id: ActiveTab; labelAr: string; labelEn: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      labelAr: 'الرئيسية',
      labelEn: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'manufacturing',
      labelAr: 'التصنيع',
      labelEn: 'Production',
      icon: <Hammer className="w-5 h-5" />,
    },
    {
      id: 'sales',
      labelAr: 'المبيعات',
      labelEn: 'Sales',
      icon: <Receipt className="w-5 h-5" />,
    },
    {
      id: 'inventory',
      labelAr: 'المخزون',
      labelEn: 'Inventory',
      icon: <Boxes className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl"
    >
      {mainTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition min-h-[48px] cursor-pointer ${
              isActive
                ? 'text-amber-400 font-bold bg-amber-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg ${isActive ? 'text-amber-400' : 'text-slate-400'}`}>
              {tab.icon}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
              {lang === 'ar' ? tab.labelAr : tab.labelEn}
            </span>
          </button>
        );
      })}

      {/* Menu Drawer Toggle */}
      <button
        onClick={onOpenMobileMenu}
        className="flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl text-slate-400 hover:text-white transition min-h-[48px] cursor-pointer"
      >
        <div className="p-1 rounded-lg text-slate-400">
          <Menu className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
          {lang === 'ar' ? 'القائمة' : 'Menu'}
        </span>
      </button>
    </nav>
  );
};
