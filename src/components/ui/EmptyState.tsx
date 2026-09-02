import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  actionLabelAr?: string;
  actionLabelEn?: string;
  onAction?: () => void;
  lang?: 'ar' | 'en';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  titleAr,
  titleEn,
  descriptionAr,
  descriptionEn,
  actionLabelAr,
  actionLabelEn,
  onAction,
  lang = 'ar',
}) => {
  return (
    <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 my-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
        <Icon className="w-8 h-8" />
      </div>

      <div className="max-w-md space-y-1">
        <h4 className="text-base sm:text-lg font-bold text-white">
          {lang === 'ar' ? titleAr : titleEn}
        </h4>
        {(descriptionAr || descriptionEn) && (
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {lang === 'ar' ? descriptionAr : descriptionEn}
          </p>
        )}
      </div>

      {onAction && actionLabelAr && (
        <button
          onClick={onAction}
          className="min-h-[44px] px-5 py-2.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 text-xs sm:text-sm transition active:scale-95 cursor-pointer mt-2"
        >
          {lang === 'ar' ? actionLabelAr : actionLabelEn}
        </button>
      )}
    </div>
  );
};
