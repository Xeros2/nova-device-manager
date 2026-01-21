import { StatCard } from "@/components/admin/StatCard";
import { useDeviceStats } from "@/hooks/useDevices";
import { 
  Smartphone, 
  Play, 
  Clock, 
  Ban, 
  TrendingUp,
  Globe,
  Activity
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = useDeviceStats();

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Vue d'ensemble de Nova Player</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const topCountries = Object.entries(stats?.countries || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de Nova Player</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Devices"
          value={stats?.total || 0}
          icon={Smartphone}
          variant="primary"
        />
        <StatCard
          title="Actifs"
          value={stats?.active || 0}
          icon={Play}
          variant="success"
        />
        <StatCard
          title="En Trial"
          value={stats?.trial || 0}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Bannis"
          value={stats?.banned || 0}
          icon={Ban}
          variant="danger"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Distribution */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5 text-nova-cyan" />
            <h2 className="text-lg font-semibold">Distribution par plateforme</h2>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Android', value: stats?.platforms.android || 0, color: 'bg-emerald-500' },
              { label: 'iOS', value: stats?.platforms.ios || 0, color: 'bg-blue-500' },
              { label: 'Windows', value: stats?.platforms.windows || 0, color: 'bg-purple-500' },
              { label: 'macOS', value: stats?.platforms.mac || 0, color: 'bg-orange-500' },
            ].map((platform) => {
              const percentage = stats?.total ? (platform.value / stats.total) * 100 : 0;
              return (
                <div key={platform.label} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{platform.label}</span>
                    <span className="font-medium">{platform.value}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${platform.color} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Countries */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="h-5 w-5 text-nova-cyan" />
            <h2 className="text-lg font-semibold">Top Pays</h2>
          </div>
          {topCountries.length > 0 ? (
            <div className="space-y-3">
              {topCountries.map(([country, count], index) => (
                <div 
                  key={country} 
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-nova-cyan/20 text-nova-cyan text-xs font-medium flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-medium">{country}</span>
                  </div>
                  <span className="text-muted-foreground">{count} devices</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Aucune donnée géographique disponible
            </p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Expirés"
          value={stats?.expired || 0}
          icon={TrendingUp}
        />
        <StatCard
          title="Taux de conversion"
          value={stats?.total ? `${Math.round((stats.active / stats.total) * 100)}%` : '0%'}
          icon={TrendingUp}
        />
        <StatCard
          title="Extensions moyennes"
          value="0"
          icon={Clock}
        />
      </div>
    </div>
  );
}
