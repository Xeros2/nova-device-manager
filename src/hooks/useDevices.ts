import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Device, DeviceFilters, DeviceStats, DeviceStatus } from "@/types/device";
import { toast } from "sonner";

export function useDevices(filters?: DeviceFilters) {
  return useQuery({
    queryKey: ['devices', filters],
    queryFn: async () => {
      let query = supabase
        .from('devices')
        .select('*')
        .order('last_seen', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.platform) {
        query = query.eq('platform', filters.platform);
      }
      if (filters?.country) {
        query = query.eq('country', filters.country);
      }
      if (filters?.player_version) {
        query = query.eq('player_version', filters.player_version);
      }
      if (filters?.manual_override !== undefined) {
        query = query.eq('manual_override', filters.manual_override);
      }
      if (filters?.search) {
        query = query.or(`device_id.ilike.%${filters.search}%,ip_address.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Device[];
    },
  });
}

export function useDeviceStats() {
  return useQuery({
    queryKey: ['device-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('devices')
        .select('status, platform, country');
      
      if (error) throw error;
      
      const stats: DeviceStats = {
        total: data.length,
        trial: data.filter(d => d.status === 'trial').length,
        active: data.filter(d => d.status === 'active').length,
        expired: data.filter(d => d.status === 'expired').length,
        banned: data.filter(d => d.status === 'banned').length,
        platforms: {
          android: data.filter(d => d.platform === 'android').length,
          ios: data.filter(d => d.platform === 'ios').length,
          windows: data.filter(d => d.platform === 'windows').length,
          mac: data.filter(d => d.platform === 'mac').length,
        },
        countries: data.reduce((acc, d) => {
          if (d.country) {
            acc[d.country] = (acc[d.country] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>),
      };
      
      return stats;
    },
  });
}

export function useDevice(deviceId: string) {
  return useQuery({
    queryKey: ['device', deviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('device_id', deviceId)
        .single();
      
      if (error) throw error;
      return data as Device;
    },
    enabled: !!deviceId,
  });
}

export function useDeviceLogs(deviceId: string) {
  return useQuery({
    queryKey: ['device-logs', deviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_action_logs')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!deviceId,
  });
}

export function useUpdateDeviceStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ deviceId, status }: { deviceId: string; status: DeviceStatus }) => {
      const { error } = await supabase
        .from('devices')
        .update({ status })
        .eq('device_id', deviceId);
      
      if (error) throw error;
      
      // Log the action
      await supabase.from('device_action_logs').insert({
        device_id: deviceId,
        action: status === 'active' ? 'activate' : status === 'banned' ? 'ban' : 'status_check',
        details: { new_status: status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device-stats'] });
      toast.success("Statut mis à jour");
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour: " + error.message);
    },
  });
}

export function useExtendTrial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ deviceId, days }: { deviceId: string; days: number }) => {
      // First get current device
      const { data: device, error: fetchError } = await supabase
        .from('devices')
        .select('trial_end, days_left, extended_count')
        .eq('device_id', deviceId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const currentEnd = device.trial_end ? new Date(device.trial_end) : new Date();
      currentEnd.setDate(currentEnd.getDate() + days);
      
      const { error } = await supabase
        .from('devices')
        .update({ 
          trial_end: currentEnd.toISOString(),
          days_left: (device.days_left || 0) + days,
          extended_count: (device.extended_count || 0) + 1,
          status: 'trial' as const,
        })
        .eq('device_id', deviceId);
      
      if (error) throw error;
      
      await supabase.from('device_action_logs').insert({
        device_id: deviceId,
        action: 'extend_trial' as const,
        details: { days_added: days },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device-stats'] });
      toast.success("Trial étendu");
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}

export function useUpdateDeviceNote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ deviceId, notes }: { deviceId: string; notes: string }) => {
      const { error } = await supabase
        .from('devices')
        .update({ notes })
        .eq('device_id', deviceId);
      
      if (error) throw error;
      
      await supabase.from('device_action_logs').insert({
        device_id: deviceId,
        action: 'add_note' as const,
        details: { note: notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success("Note ajoutée");
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}

export function useBatchAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      deviceIds, 
      action, 
      data 
    }: { 
      deviceIds: string[]; 
      action: 'ban' | 'unban' | 'extend' | 'expire';
      data?: { days?: number };
    }) => {
      for (const deviceId of deviceIds) {
        if (action === 'ban') {
          await supabase
            .from('devices')
            .update({ status: 'banned' as const })
            .eq('device_id', deviceId);
        } else if (action === 'unban') {
          await supabase
            .from('devices')
            .update({ status: 'trial' as const })
            .eq('device_id', deviceId);
        } else if (action === 'expire') {
          await supabase
            .from('devices')
            .update({ status: 'expired' as const, days_left: 0 })
            .eq('device_id', deviceId);
        } else if (action === 'extend' && data?.days) {
          const { data: device } = await supabase
            .from('devices')
            .select('trial_end, days_left, extended_count')
            .eq('device_id', deviceId)
            .single();
          
          if (device) {
            const currentEnd = device.trial_end ? new Date(device.trial_end) : new Date();
            currentEnd.setDate(currentEnd.getDate() + data.days);
            
            await supabase
              .from('devices')
              .update({
                trial_end: currentEnd.toISOString(),
                days_left: (device.days_left || 0) + data.days,
                extended_count: (device.extended_count || 0) + 1,
              })
              .eq('device_id', deviceId);
          }
        }
        
        await supabase.from('device_action_logs').insert({
          device_id: deviceId,
          action: 'batch_action' as const,
          details: { action, data },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device-stats'] });
      toast.success("Action groupée effectuée");
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}

export function useRegeneratePIN() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (deviceId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-regenerate-pin', {
        body: { device_id: deviceId }
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data as { success: boolean; device_id: string; uid: string; new_pin: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device-logs'] });
    },
    onError: (error) => {
      toast.error("Erreur lors de la régénération du PIN: " + error.message);
    },
  });
}
