import { useParams, useNavigate } from "react-router-dom";
import { useDevice, useDeviceLogs, useUpdateDeviceStatus, useExtendTrial, useUpdateDeviceNote } from "@/hooks/useDevices";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PlatformIcon, getPlatformLabel } from "@/components/admin/PlatformIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Copy, 
  Play, 
  Ban, 
  Clock, 
  RefreshCw,
  Globe,
  Shield,
  Calendar,
  Activity,
  FileText,
  Save
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useState } from "react";

export default function DeviceDetail() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const { data: device, isLoading } = useDevice(deviceId || '');
  const { data: logs } = useDeviceLogs(deviceId || '');
  const updateStatus = useUpdateDeviceStatus();
  const extendTrial = useExtendTrial();
  const updateNote = useUpdateDeviceNote();

  const [extendDays, setExtendDays] = useState(7);
  const [notes, setNotes] = useState('');
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);

  const copyDeviceId = () => {
    if (device?.device_id) {
      navigator.clipboard.writeText(device.device_id);
      toast.success("Device ID copié");
    }
  };

  const handleExtendTrial = async () => {
    if (deviceId) {
      await extendTrial.mutateAsync({ deviceId, days: extendDays });
      setExtendDialogOpen(false);
    }
  };

  const handleSaveNote = async () => {
    if (deviceId && notes.trim()) {
      await updateNote.mutateAsync({ deviceId, notes });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-muted-foreground mb-4">Device non trouvé</p>
        <Button variant="outline" onClick={() => navigate('/admin/devices')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/devices')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Device</h1>
              <StatusBadge status={device.status} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm font-mono text-muted-foreground">
                {device.device_id}
              </code>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyDeviceId}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => updateStatus.mutate({ deviceId: device.device_id, status: 'active' })}
            className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
          >
            <Play className="h-4 w-4 mr-2" />
            Activer
          </Button>
          <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10"
              >
                <Clock className="h-4 w-4 mr-2" />
                Étendre trial
              </Button>
            </DialogTrigger>
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
          <Button
            variant="outline"
            onClick={() => updateStatus.mutate({ deviceId: device.device_id, status: 'trial' })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset trial
          </Button>
          <Button
            variant="outline"
            onClick={() => updateStatus.mutate({ deviceId: device.device_id, status: 'banned' })}
            className="text-red-400 border-red-500/30 hover:bg-red-500/10"
          >
            <Ban className="h-4 w-4 mr-2" />
            Bannir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Info */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlatformIcon platform={device.platform} className="h-5 w-5" />
              Informations du device
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plateforme</p>
                  <p className="font-medium">{getPlatformLabel(device.platform)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Modèle</p>
                  <p className="font-medium">{device.device_model}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Version OS</p>
                  <p className="font-medium">{device.os_version}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Architecture</p>
                  <p className="font-medium font-mono">{device.architecture}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Version Player</p>
                  <p className="font-medium font-mono">{device.player_version}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Build</p>
                  <p className="font-medium font-mono">{device.app_build}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Extensions</p>
                  <p className="font-medium">{device.extended_count} fois</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Override manuel</p>
                  <p className="font-medium">{device.manual_override ? 'Oui' : 'Non'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trial Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Trial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Début</p>
              <p className="font-medium">
                {device.trial_start 
                  ? format(new Date(device.trial_start), 'dd/MM/yyyy HH:mm', { locale: fr })
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fin</p>
              <p className="font-medium">
                {device.trial_end 
                  ? format(new Date(device.trial_end), 'dd/MM/yyyy HH:mm', { locale: fr })
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Jours restants</p>
              <p className="text-2xl font-bold text-nova-cyan">{device.days_left}</p>
            </div>
          </CardContent>
        </Card>

        {/* Network Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Réseau
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Adresse IP</p>
              <p className="font-medium font-mono">{device.ip_address || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pays</p>
              <p className="font-medium">{device.country || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ville</p>
              <p className="font-medium">{device.city || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">FAI</p>
              <p className="font-medium">{device.isp || '-'}</p>
            </div>
            <div className="flex items-center gap-2">
              <Shield className={device.is_vpn ? 'h-4 w-4 text-yellow-400' : 'h-4 w-4 text-emerald-400'} />
              <span className="text-sm">
                {device.is_vpn ? 'VPN détecté' : 'Pas de VPN'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Première connexion</p>
              <p className="font-medium">
                {format(new Date(device.first_seen), 'dd/MM/yyyy HH:mm', { locale: fr })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dernière activité</p>
              <p className="font-medium">
                {formatDistanceToNow(new Date(device.last_seen), { 
                  addSuffix: true,
                  locale: fr 
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes
            </CardTitle>
            <CardDescription>Notes privées sur ce device</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Ajouter une note..."
              value={notes || device.notes || ''}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-24 bg-secondary border-border"
            />
            <Button 
              onClick={handleSaveNote} 
              disabled={updateNote.isPending}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Action Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des actions</CardTitle>
          <CardDescription>Dernières 50 actions sur ce device</CardDescription>
        </CardHeader>
        <CardContent>
          {logs && logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono px-2 py-1 rounded bg-muted">
                      {log.action}
                    </span>
                    {log.details && (
                      <span className="text-sm text-muted-foreground">
                        {JSON.stringify(log.details)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), { 
                      addSuffix: true,
                      locale: fr 
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Aucun historique disponible
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
