export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      device_action_logs: {
        Row: {
          action: Database["public"]["Enums"]["action_type"]
          admin_id: string | null
          created_at: string | null
          details: Json | null
          device_id: string
          id: string
          ip_address: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["action_type"]
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          device_id: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["action_type"]
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          device_id?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      devices: {
        Row: {
          app_build: number
          architecture: Database["public"]["Enums"]["device_architecture"]
          city: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          days_left: number | null
          device_id: string
          device_model: string
          extended_count: number | null
          first_seen: string | null
          id: string
          ip_address: string | null
          is_vpn: boolean | null
          isp: string | null
          last_seen: string | null
          manual_override: boolean | null
          notes: string | null
          os_version: string
          pin_created_at: string | null
          pin_hash: string | null
          platform: Database["public"]["Enums"]["device_platform"]
          player_version: string
          status: Database["public"]["Enums"]["device_status"]
          trial_end: string | null
          trial_start: string | null
          uid: string | null
          updated_at: string | null
        }
        Insert: {
          app_build?: number
          architecture: Database["public"]["Enums"]["device_architecture"]
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          days_left?: number | null
          device_id: string
          device_model: string
          extended_count?: number | null
          first_seen?: string | null
          id?: string
          ip_address?: string | null
          is_vpn?: boolean | null
          isp?: string | null
          last_seen?: string | null
          manual_override?: boolean | null
          notes?: string | null
          os_version: string
          pin_created_at?: string | null
          pin_hash?: string | null
          platform: Database["public"]["Enums"]["device_platform"]
          player_version: string
          status?: Database["public"]["Enums"]["device_status"]
          trial_end?: string | null
          trial_start?: string | null
          uid?: string | null
          updated_at?: string | null
        }
        Update: {
          app_build?: number
          architecture?: Database["public"]["Enums"]["device_architecture"]
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          days_left?: number | null
          device_id?: string
          device_model?: string
          extended_count?: number | null
          first_seen?: string | null
          id?: string
          ip_address?: string | null
          is_vpn?: boolean | null
          isp?: string | null
          last_seen?: string | null
          manual_override?: boolean | null
          notes?: string | null
          os_version?: string
          pin_created_at?: string | null
          pin_hash?: string | null
          platform?: Database["public"]["Enums"]["device_platform"]
          player_version?: string
          status?: Database["public"]["Enums"]["device_status"]
          trial_end?: string | null
          trial_start?: string | null
          uid?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_admin_role: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      action_type:
        | "register"
        | "status_check"
        | "activate"
        | "ban"
        | "unban"
        | "extend_trial"
        | "reset_trial"
        | "set_expiry"
        | "add_note"
        | "batch_action"
        | "regenerate_pin"
      admin_role: "super_admin" | "admin" | "moderator"
      device_architecture: "arm64" | "x64"
      device_platform: "android" | "ios" | "windows" | "mac"
      device_status: "trial" | "active" | "expired" | "banned"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      action_type: [
        "register",
        "status_check",
        "activate",
        "ban",
        "unban",
        "extend_trial",
        "reset_trial",
        "set_expiry",
        "add_note",
        "batch_action",
        "regenerate_pin",
      ],
      admin_role: ["super_admin", "admin", "moderator"],
      device_architecture: ["arm64", "x64"],
      device_platform: ["android", "ios", "windows", "mac"],
      device_status: ["trial", "active", "expired", "banned"],
    },
  },
} as const
