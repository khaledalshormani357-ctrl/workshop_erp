import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  PackageCheck,
  Truck,
  Layers,
  FileText
} from 'lucide-react';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'primary'
  | 'draft'
  | 'approved'
  | 'in_progress'
  | 'completed';

interface StatusBadgeProps {
  variant?: BadgeVariant;
  label: string;
  icon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant = 'neutral',
  label,
  icon = true,
  className = '',
}) => {
  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
  let IconComponent = Clock;

  switch (variant) {
    case 'success':
    case 'approved':
    case 'completed':
      colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      IconComponent = CheckCircle2;
      break;
    case 'warning':
    case 'in_progress':
      colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      IconComponent = Clock;
      break;
    case 'danger':
      colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      IconComponent = XCircle;
      break;
    case 'info':
      colorClasses = 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      IconComponent = FileText;
      break;
    case 'primary':
      colorClasses = 'bg-amber-500 text-slate-950 font-bold border-amber-400';
      IconComponent = Layers;
      break;
    case 'draft':
      colorClasses = 'bg-slate-800 text-slate-400 border-slate-700';
      IconComponent = Clock;
      break;
    default:
      colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
      IconComponent = Clock;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClasses} ${className}`}
    >
      {icon && <IconComponent className="w-3.5 h-3.5 flex-shrink-0" />}
      <span>{label}</span>
    </span>
  );
};
