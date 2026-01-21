import { Smartphone, Monitor, Apple } from "lucide-react";
import type { DevicePlatform } from "@/types/device";

interface PlatformIconProps {
  platform: DevicePlatform;
  className?: string;
}

export function PlatformIcon({ platform, className = "h-4 w-4" }: PlatformIconProps) {
  switch (platform) {
    case 'android':
      return <Smartphone className={className} />;
    case 'ios':
      return <Apple className={className} />;
    case 'windows':
      return <Monitor className={className} />;
    case 'mac':
      return <Apple className={className} />;
    default:
      return <Smartphone className={className} />;
  }
}

export function getPlatformLabel(platform: DevicePlatform): string {
  const labels: Record<DevicePlatform, string> = {
    android: 'Android',
    ios: 'iOS',
    windows: 'Windows',
    mac: 'macOS',
  };
  return labels[platform];
}
