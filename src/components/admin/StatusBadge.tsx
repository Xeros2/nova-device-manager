import { cn } from "@/lib/utils";
import type { DeviceStatus } from "@/types/device";

interface StatusBadgeProps {
  status: DeviceStatus;
  className?: string;
}

const statusConfig: Record<DeviceStatus, { label: string; className: string }> = {
  trial: {
    label: 'Trial',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  active: {
    label: 'Active',
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  expired: {
    label: 'Expired',
    className: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  banned: {
    label: 'Banned',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {config.label}
    </span>
  );
}
