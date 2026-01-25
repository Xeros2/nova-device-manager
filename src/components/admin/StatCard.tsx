import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
  onClick?: () => void;
}

const variantStyles = {
  default: 'border-border',
  primary: 'border-primary/30 bg-primary/5',
  success: 'border-emerald-500/30 bg-emerald-500/5',
  warning: 'border-yellow-500/30 bg-yellow-500/5',
  danger: 'border-red-500/30 bg-red-500/5',
};

const iconVariantStyles = {
  default: 'text-muted-foreground',
  primary: 'text-primary',
  success: 'text-emerald-400',
  warning: 'text-yellow-400',
  danger: 'text-red-400',
};

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  variant = 'default',
  className,
  onClick
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-6 bg-card transition-all",
        variantStyles[variant],
        onClick && "cursor-pointer hover:border-primary/50 hover:shadow-lg",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {trend && (
            <p className={cn(
              "mt-1 text-xs font-medium",
              trend.positive ? "text-emerald-400" : "text-red-400"
            )}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% from last week
            </p>
          )}
        </div>
        <div className={cn(
          "rounded-lg p-2.5 bg-secondary",
          iconVariantStyles[variant]
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      
      {/* Decorative glow */}
      {variant === 'primary' && (
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
      )}
    </div>
  );
}
