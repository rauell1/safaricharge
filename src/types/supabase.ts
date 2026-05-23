/**
 * SafariCharge – Supabase Database types
 *
 * Manually crafted to match the schema in:
 *   supabase/migrations/20260523_profiles.sql
 *   supabase/migrations/20260523_additional_tables.sql
 *   supabase/migrations/20260523_full_migration.sql
 *   supabase/migrations/20260524_indexes_and_grants.sql
 *
 * Regenerate automatically with:
 *   npx supabase gen types typescript \
 *     --project-id pnlylqdtaucoegotbycw \
 *     --schema public \
 *     > src/types/supabase.ts
 *
 * Convenience helpers at the bottom:
 *   Tables<'table_name'>        → Row shape
 *   InsertTables<'table_name'>  → Insert shape
 *   UpdateTables<'table_name'>  → Update shape
 */

// ---------------------------------------------------------------------------
// Primitive helpers
// ---------------------------------------------------------------------------

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------------------------------------------------------------------------
// Database definition
// ---------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {

      // ── profiles ──────────────────────────────────────────────────────────
      profiles: {
        Row: {
          id: string;
          email: string | null;
          subscription_status: string;
          plan: string;
          full_name: string | null;
          phone: string | null;
          organization: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          subscription_status?: string;
          plan?: string;
          full_name?: string | null;
          phone?: string | null;
          organization?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          subscription_status?: string;
          plan?: string;
          full_name?: string | null;
          phone?: string | null;
          organization?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      // ── saved_scenarios ───────────────────────────────────────────────────
      saved_scenarios: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          config: Json;
          finance: Json;
          performance: Json;
          location: Json;
          engineering: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          config?: Json;
          finance?: Json;
          performance?: Json;
          location?: Json;
          engineering?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          config?: Json;
          finance?: Json;
          performance?: Json;
          location?: Json;
          engineering?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'saved_scenarios_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      // ── solar_components_catalog ──────────────────────────────────────────
      solar_components_catalog: {
        Row: {
          id: string;
          brand: string;
          model: string;
          category:
            | 'Solar Module'
            | 'Inverter'
            | 'Battery Storage'
            | 'EV Charger'
            | 'Monitoring';
          summary: string;
          typical_use: string;
          specs: Json;
          datasheet_url: string;
          manual_url: string;
          source: string;
          is_builtin: boolean;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          brand: string;
          model: string;
          category:
            | 'Solar Module'
            | 'Inverter'
            | 'Battery Storage'
            | 'EV Charger'
            | 'Monitoring';
          summary?: string;
          typical_use?: string;
          specs?: Json;
          datasheet_url?: string;
          manual_url?: string;
          source?: string;
          is_builtin?: boolean;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          brand?: string;
          model?: string;
          category?:
            | 'Solar Module'
            | 'Inverter'
            | 'Battery Storage'
            | 'EV Charger'
            | 'Monitoring';
          summary?: string;
          typical_use?: string;
          specs?: Json;
          datasheet_url?: string;
          manual_url?: string;
          source?: string;
          is_builtin?: boolean;
          user_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'solar_components_catalog_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      // ── component_assets ──────────────────────────────────────────────────
      component_assets: {
        Row: {
          id: string;
          user_id: string;
          component_id: string | null;
          name: string;
          category: string;
          storage_path: string;
          url: string;
          file_size_bytes: number | null;
          mime_type: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          component_id?: string | null;
          name: string;
          category: string;
          storage_path: string;
          url: string;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          component_id?: string | null;
          name?: string;
          category?: string;
          storage_path?: string;
          url?: string;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          uploaded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'component_assets_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'component_assets_component_id_fkey';
            columns: ['component_id'];
            isOneToOne: false;
            referencedRelation: 'solar_components_catalog';
            referencedColumns: ['id'];
          },
        ];
      };

      // ── ai_conversations ──────────────────────────────────────────────────
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_conversations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      // ── ai_messages ───────────────────────────────────────────────────────
      ai_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: 'user' | 'assistant';
          content: string;
          system_data_snapshot: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: 'user' | 'assistant';
          content: string;
          system_data_snapshot?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: 'user' | 'assistant';
          content?: string;
          system_data_snapshot?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'ai_conversations';
            referencedColumns: ['id'];
          },
        ];
      };

      // ── ai_response_cache ─────────────────────────────────────────────────
      ai_response_cache: {
        Row: {
          cache_key: string;
          response: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          cache_key: string;
          response: string;
          created_at?: string;
          expires_at: string;
        };
        Update: {
          cache_key?: string;
          response?: string;
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };

      // ── simulation_runs ───────────────────────────────────────────────────
      simulation_runs: {
        Row: {
          id: string;
          user_id: string;
          scenario_id: string | null;
          name: string;
          solar_capacity_kw: number | null;
          battery_capacity_kwh: number | null;
          inverter_kw: number | null;
          system_mode: string | null;
          location_name: string | null;
          latitude: number | null;
          longitude: number | null;
          total_minutes: number | null;
          summary_json: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          scenario_id?: string | null;
          name?: string;
          solar_capacity_kw?: number | null;
          battery_capacity_kwh?: number | null;
          inverter_kw?: number | null;
          system_mode?: string | null;
          location_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          total_minutes?: number | null;
          summary_json?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          scenario_id?: string | null;
          name?: string;
          solar_capacity_kw?: number | null;
          battery_capacity_kwh?: number | null;
          inverter_kw?: number | null;
          system_mode?: string | null;
          location_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          total_minutes?: number | null;
          summary_json?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'simulation_runs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'simulation_runs_scenario_id_fkey';
            columns: ['scenario_id'];
            isOneToOne: false;
            referencedRelation: 'saved_scenarios';
            referencedColumns: ['id'];
          },
        ];
      };

      // ── simulation_data ───────────────────────────────────────────────────
      simulation_data: {
        Row: {
          id: number;
          run_id: string;
          ts: string;
          solar_kw: number | null;
          home_load_kw: number | null;
          ev1_load_kw: number | null;
          ev2_load_kw: number | null;
          battery_level_pct: number | null;
          grid_import_kw: number | null;
          grid_export_kw: number | null;
          savings_kes: number | null;
          tariff_rate: number | null;
          is_peak_time: boolean | null;
        };
        Insert: {
          id?: number;
          run_id: string;
          ts: string;
          solar_kw?: number | null;
          home_load_kw?: number | null;
          ev1_load_kw?: number | null;
          ev2_load_kw?: number | null;
          battery_level_pct?: number | null;
          grid_import_kw?: number | null;
          grid_export_kw?: number | null;
          savings_kes?: number | null;
          tariff_rate?: number | null;
          is_peak_time?: boolean | null;
        };
        Update: {
          id?: number;
          run_id?: string;
          ts?: string;
          solar_kw?: number | null;
          home_load_kw?: number | null;
          ev1_load_kw?: number | null;
          ev2_load_kw?: number | null;
          battery_level_pct?: number | null;
          grid_import_kw?: number | null;
          grid_export_kw?: number | null;
          savings_kes?: number | null;
          tariff_rate?: number | null;
          is_peak_time?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'simulation_data_run_id_fkey';
            columns: ['run_id'];
            isOneToOne: false;
            referencedRelation: 'simulation_runs';
            referencedColumns: ['id'];
          },
        ];
      };

      // ── rate_limit_counters ───────────────────────────────────────────────
      rate_limit_counters: {
        Row: {
          key: string;
          count: number;
          window_start: string;
          expires_at: string;
        };
        Insert: {
          key: string;
          count?: number;
          window_start: string;
          expires_at: string;
        };
        Update: {
          key?: string;
          count?: number;
          window_start?: string;
          expires_at?: string;
        };
        Relationships: [];
      };

      // ── user_preferences ──────────────────────────────────────────────────
      user_preferences: {
        Row: {
          user_id: string;
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          key?: string;
          value?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      // ── battery_modules ───────────────────────────────────────────────────
      battery_modules: {
        Row: {
          id: string;
          label: string;
          usable_kwh: number;
          nominal_voltage_v: number;
          max_charge_kw_per_module: number;
          max_discharge_kw_per_module: number;
          chemistry: 'lifepo4' | 'lead-acid' | 'nmc';
          rte: number;
          min_modules: number;
          max_modules: number;
          catalog_id: string;
          is_builtin: boolean;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          label: string;
          usable_kwh: number;
          nominal_voltage_v: number;
          max_charge_kw_per_module: number;
          max_discharge_kw_per_module: number;
          chemistry: 'lifepo4' | 'lead-acid' | 'nmc';
          rte: number;
          min_modules: number;
          max_modules: number;
          catalog_id: string;
          is_builtin?: boolean;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          usable_kwh?: number;
          nominal_voltage_v?: number;
          max_charge_kw_per_module?: number;
          max_discharge_kw_per_module?: number;
          chemistry?: 'lifepo4' | 'lead-acid' | 'nmc';
          rte?: number;
          min_modules?: number;
          max_modules?: number;
          catalog_id?: string;
          is_builtin?: boolean;
          user_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'battery_modules_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      // ── irradiance_presets ────────────────────────────────────────────────
      irradiance_presets: {
        Row: {
          code: string;
          county: string;
          lat: number;
          lon: number;
          avg_daily_psh: number;
          annual_yield: number;
          climate_zone: string;
          is_kosap: boolean;
          grid_reliability: number | null;
          data: Json;
          created_at: string;
        };
        Insert: {
          code: string;
          county: string;
          lat: number;
          lon: number;
          avg_daily_psh: number;
          annual_yield: number;
          climate_zone: string;
          is_kosap?: boolean;
          grid_reliability?: number | null;
          data?: Json;
          created_at?: string;
        };
        Update: {
          code?: string;
          county?: string;
          lat?: number;
          lon?: number;
          avg_daily_psh?: number;
          annual_yield?: number;
          climate_zone?: string;
          is_kosap?: boolean;
          grid_reliability?: number | null;
          data?: Json;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── africa_locations ──────────────────────────────────────────────────
      africa_locations: {
        Row: {
          id: string;
          name: string;
          country: string;
          country_code: string;
          region: string;
          lat: number;
          lon: number;
          elevation: number;
          avg_daily_psh: number;
          annual_ghi: number;
          avg_temp_c: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          country: string;
          country_code: string;
          region: string;
          lat: number;
          lon: number;
          elevation: number;
          avg_daily_psh: number;
          annual_ghi: number;
          avg_temp_c: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          country?: string;
          country_code?: string;
          region?: string;
          lat?: number;
          lon?: number;
          elevation?: number;
          avg_daily_psh?: number;
          annual_ghi?: number;
          avg_temp_c?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };

    // ── Views ──────────────────────────────────────────────────────────────
    Views: Record<string, never>;

    // ── Functions ──────────────────────────────────────────────────────────
    Functions: {
      increment_rate_limit: {
        Args: {
          p_key: string;
          p_limit: number;
          p_window_ms: number;
        };
        Returns: Array<{
          allowed: boolean;
          count: number;
          retry_after_ms: number;
        }>;
      };
    };

    // ── Enums ──────────────────────────────────────────────────────────────
    Enums: Record<string, never>;

    // ── CompositeTypes ─────────────────────────────────────────────────────
    CompositeTypes: Record<string, never>;
  };
};

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/** Row shape for a given table name. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/** Insert shape for a given table name. */
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/** Update shape for a given table name. */
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// ---------------------------------------------------------------------------
// Typed Supabase client factory helpers (re-export pattern)
// ---------------------------------------------------------------------------

/**
 * Use these with createClient<Database>() / createServerClient<Database>() /
 * createBrowserClient<Database>() so every .from() call is fully type-safe.
 *
 * Example:
 *   import { createBrowserClient } from '@supabase/ssr'
 *   import type { Database } from '@/types/supabase'
 *
 *   const supabase = createBrowserClient<Database>(url, key)
 *   const { data } = await supabase.from('saved_scenarios').select('*')
 *   //    ^^ data is Tables<'saved_scenarios'>[] | null
 */
export type SupabaseClient = ReturnType<
  typeof import('@supabase/supabase-js').createClient<Database>
>;
