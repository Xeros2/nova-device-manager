import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Globe, Clock, Shield, Code } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const [trialDays, setTrialDays] = useState(7);
  const [autoExpire, setAutoExpire] = useState(true);
  const [vpnBlock, setVpnBlock] = useState(false);

  const handleSave = () => {
    toast.success("Paramètres sauvegardés");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Configuration du système Nova Player</p>
      </div>

      {/* Trial Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Configuration Trial
          </CardTitle>
          <CardDescription>
            Paramètres par défaut pour les nouveaux devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="trial-days">Durée du trial (jours)</Label>
              <Input
                id="trial-days"
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value) || 7)}
                min={1}
                max={365}
                className="w-32 bg-secondary border-border"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Expiration automatique</Label>
                <p className="text-sm text-muted-foreground">
                  Expirer automatiquement les trials terminés
                </p>
              </div>
              <Switch
                checked={autoExpire}
                onCheckedChange={setAutoExpire}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Sécurité
          </CardTitle>
          <CardDescription>
            Options de sécurité et restrictions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Bloquer les VPN</Label>
              <p className="text-sm text-muted-foreground">
                Refuser l'accès aux connexions VPN détectées
              </p>
            </div>
            <Switch
              checked={vpnBlock}
              onCheckedChange={setVpnBlock}
            />
          </div>
        </CardContent>
      </Card>

      {/* API Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            API Endpoints
          </CardTitle>
          <CardDescription>
            Endpoints disponibles pour l'application Flutter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-between mb-2">
                <code className="text-sm font-mono text-nova-cyan">POST /api/device/register</code>
                <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">Public</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Enregistrer un nouveau device à la première ouverture
              </p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-between mb-2">
                <code className="text-sm font-mono text-nova-cyan">POST /api/device/status</code>
                <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">Public</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Vérifier le statut d'un device à chaque lancement
              </p>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-nova-cyan" />
              <span className="font-medium">Base URL</span>
            </div>
            <code className="text-sm font-mono text-muted-foreground block">
              https://kcverunpdrbiiyeqekzw.supabase.co/functions/v1
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="nova-gradient text-primary-foreground">
          <SettingsIcon className="h-4 w-4 mr-2" />
          Sauvegarder les paramètres
        </Button>
      </div>
    </div>
  );
}
