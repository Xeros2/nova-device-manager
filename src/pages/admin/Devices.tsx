import { useState } from "react";
import { useDevices, useUpdateDeviceStatus, useExtendTrial, useBatchAction } from "@/hooks/useDevices";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PlatformIcon, getPlatformLabel } from "@/components/admin/PlatformIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  MoreVertical, 
  Play, 
  Ban, 
  Clock, 
  RefreshCw,
  Copy,
  Eye,
  Filter,
  X,
  Fingerprint
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { DeviceFilters, DeviceStatus, DevicePlatform } from "@/types/device";
import { Skeleton } from "@/components/ui/skeleton";

export default function Devices() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<DeviceFilters>({});
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [extendDays, setExtendDays] = useState(7);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  const { data: devices, isLoading } = useDevices(filters);
  const updateStatus = useUpdateDeviceStatus();
  const extendTrial = useExtendTrial();
  const batchAction = useBatchAction();

  const handleSelectAll = (checked: boolean) => {
    if (checked && devices) {
      setSelectedDevices(devices.map(d => d.device_id));
    } else {
      setSelectedDevices([]);
    }
  };

  const handleSelectDevice = (deviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedDevices(prev => [...prev, deviceId]);
    } else {
      setSelectedDevices(prev => prev.filter(id => id !== deviceId));
    }
  };

  const copyDeviceId = (deviceId: string) => {
    navigator.clipboard.writeText(deviceId);
    toast.success("Device ID copié");
  };

  const copyUID = (uid: string) => {
    navigator.clipboard.writeText(uid);
    toast.success("UID copié");
  };

  const handleExtendTrial = async () => {
    if (currentDeviceId) {
      await extendTrial.mutateAsync({ deviceId: currentDeviceId, days: extendDays });
      setExtendDialogOpen(false);
      setCurrentDeviceId(null);
    }
  };

  const handleBatchAction = async (action: 'ban' | 'unban' | 'extend' | 'expire') => {
    if (selectedDevices.length === 0) return;
    await batchAction.mutateAsync({ 
      deviceIds: selectedDevices, 
      action,
      data: action === 'extend' ? { days: 7 } : undefined,
    });
    setSelectedDevices([]);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Devices</h1>
          <p className="text-muted-foreground mt-1">
            {devices?.length || 0} devices enregistrés
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtres</span>
        </div>
        
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par ID ou IP..."
            value={filters.search || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="pl-9 bg-secondary border-border"
          />
        </div>

        <Select 
          value={filters.status || 'all'} 
          onValueChange={(value) => setFilters(prev => ({ 
            ...prev, 
            status: value === 'all' ? undefined : value as DeviceStatus 
          }))}
        >
          <SelectTrigger className="w-32 bg-secondary border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="expired">Expiré</SelectItem>
            <SelectItem value="banned">Banni</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={filters.platform || 'all'} 
          onValueChange={(value) => setFilters(prev => ({ 
            ...prev, 
            platform: value === 'all' ? undefined : value as DevicePlatform 
          }))}
        >
          <SelectTrigger className="w-32 bg-secondary border-border">
            <SelectValue placeholder="Plateforme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="android">Android</SelectItem>
            <SelectItem value="ios">iOS</SelectItem>
            <SelectItem value="windows">Windows</SelectItem>
            <SelectItem value="mac">macOS</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-4 w-4" />
            Effacer
          </Button>
        )}
      </div>

      {/* Batch Actions */}
      {selectedDevices.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-nova-cyan/30 bg-nova-cyan/5">
          <span className="text-sm font-medium">
            {selectedDevices.length} sélectionné(s)
          </span>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleBatchAction('ban')}
              className="text-red-400 border-red-500/30 hover:bg-red-500/10"
            >
              <Ban className="h-4 w-4 mr-1" />
              Bannir
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleBatchAction('unban')}
              className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Débannir
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleBatchAction('extend')}
              className="text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10"
            >
              <Clock className="h-4 w-4 mr-1" />
              +7 jours
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleBatchAction('expire')}
              className="text-orange-400 border-orange-500/30 hover:bg-orange-500/10"
            >
              Expirer
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox 
                  checked={devices?.length ? selectedDevices.length === devices.length : false}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>UID</TableHead>
              <TableHead>Device ID</TableHead>
              <TableHead>Plateforme</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fin Trial</TableHead>
              <TableHead>Dernière activité</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(10)].map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : devices?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                  Aucun device trouvé
                </TableCell>
              </TableRow>
            ) : (
              devices?.map((device) => (
                <TableRow 
                  key={device.id} 
                  className="border-border cursor-pointer hover:bg-secondary/50"
                  onClick={() => navigate(`/admin/devices/${device.device_id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedDevices.includes(device.device_id)}
                      onCheckedChange={(checked) => handleSelectDevice(device.device_id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    {device.uid ? (
                      <div className="flex items-center gap-1">
                        <code className="text-xs font-mono font-bold text-nova-cyan bg-nova-cyan/10 px-2 py-1 rounded">
                          {device.uid}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyUID(device.uid!);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs font-mono bg-secondary px-2 py-1 rounded">
                      {device.device_id.slice(0, 8)}...
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={device.platform} className="h-4 w-4 text-muted-foreground" />
                      <span>{getPlatformLabel(device.platform)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{device.player_version}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {device.ip_address || '-'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={device.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {device.trial_end 
                      ? format(new Date(device.trial_end), 'dd/MM/yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(device.last_seen), { 
                      addSuffix: true,
                      locale: fr 
                    })}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/admin/devices/${device.device_id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Voir détails
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => updateStatus.mutate({ 
                            deviceId: device.device_id, 
                            status: 'active' 
                          })}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Activer
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setCurrentDeviceId(device.device_id);
                            setExtendDialogOpen(true);
                          }}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Étendre trial
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => updateStatus.mutate({ 
                            deviceId: device.device_id, 
                            status: 'banned' 
                          })}
                          className="text-red-400 focus:text-red-400"
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Bannir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Extend Trial Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Étendre le trial</DialogTitle>
            <DialogDescription>
              Ajoutez des jours au trial de ce device
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={extendDays}
                onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                min={1}
                max={365}
                className="w-24"
              />
              <span className="text-muted-foreground">jours</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleExtendTrial} disabled={extendTrial.isPending}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
