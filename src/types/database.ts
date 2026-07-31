// Supabase database types - manually typed for MVP tables
// Auto-generated types would be created via: npx supabase gen types typescript

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          company: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          company?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          company?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      brand_kits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          primary_color: string | null;
          secondary_color: string | null;
          accent_color: string | null;
          font_heading: string | null;
          font_body: string | null;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          primary_color?: string | null;
          secondary_color?: string | null;
          accent_color?: string | null;
          font_heading?: string | null;
          font_body?: string | null;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          primary_color?: string | null;
          secondary_color?: string | null;
          accent_color?: string | null;
          font_heading?: string | null;
          font_body?: string | null;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      assets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: "image" | "video" | "logo" | "template" | "generated";
          url: string;
          thumbnail_url: string | null;
          size_bytes: number | null;
          width: number | null;
          height: number | null;
          format: string | null;
          tags: string[] | null;
          prompt: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: "image" | "video" | "logo" | "template" | "generated";
          url: string;
          thumbnail_url?: string | null;
          size_bytes?: number | null;
          width?: number | null;
          height?: number | null;
          format?: string | null;
          tags?: string[] | null;
          prompt?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: "image" | "video" | "logo" | "template" | "generated";
          url?: string;
          thumbnail_url?: string | null;
          size_bytes?: number | null;
          width?: number | null;
          height?: number | null;
          format?: string | null;
          tags?: string[] | null;
          prompt?: string | null;
          created_at?: string;
        };
      };
      generated_copy: {
        Row: {
          id: string;
          user_id: string;
          product_name: string;
          product_description: string | null;
          target_audience: string | null;
          budget: number | null;
          platform: string;
          headlines: string[];
          descriptions: string[];
          ctas: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_name: string;
          product_description?: string | null;
          target_audience?: string | null;
          budget?: number | null;
          platform: string;
          headlines: string[];
          descriptions: string[];
          ctas: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_name?: string;
          product_description?: string | null;
          target_audience?: string | null;
          budget?: number | null;
          platform?: string;
          headlines?: string[];
          descriptions?: string[];
          ctas?: string[];
          created_at?: string;
        };
      };
      // ----- BYOK + self-managed usage (migration 0003) -----
      user_api_keys: {
        Row: {
          id: string;
          user_id: string;
          provider: "openai" | "anthropic" | "google" | "minimax";
          label: string | null;
          secret_id: string;
          key_last4: string | null;
          verify_status: "unknown" | "ok" | "invalid";
          verify_message: string | null;
          created_at: string;
          last_used_at: string | null;
          last_verified_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: "openai" | "anthropic" | "google" | "minimax";
          label?: string | null;
          secret_id: string;
          key_last4?: string | null;
          verify_status?: "unknown" | "ok" | "invalid";
          verify_message?: string | null;
          created_at?: string;
          last_used_at?: string | null;
          last_verified_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: "openai" | "anthropic" | "google" | "minimax";
          label?: string | null;
          secret_id?: string;
          key_last4?: string | null;
          verify_status?: "unknown" | "ok" | "invalid";
          verify_message?: string | null;
          created_at?: string;
          last_used_at?: string | null;
          last_verified_at?: string | null;
        };
      };
      user_quotas: {
        Row: {
          user_id: string;
          monthly_budget_usd: number;
          copy_budget_usd: number;
          image_budget_usd: number;
          monthly_request_cap: number;
          enforce_caps: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          monthly_budget_usd?: number;
          copy_budget_usd?: number;
          image_budget_usd?: number;
          monthly_request_cap?: number;
          enforce_caps?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          monthly_budget_usd?: number;
          copy_budget_usd?: number;
          image_budget_usd?: number;
          monthly_request_cap?: number;
          enforce_caps?: boolean;
          updated_at?: string;
        };
      };
      usage_events: {
        Row: {
          id: number;
          user_id: string;
          feature: "copy" | "image";
          provider: string;
          model: string;
          status: "ok" | "error" | "denied";
          http_status: number | null;
          input_tokens: number;
          output_tokens: number;
          image_count: number;
          est_cost_usd: number;
          prompt_chars: number | null;
          error_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          feature: "copy" | "image";
          provider: string;
          model: string;
          status: "ok" | "error" | "denied";
          http_status?: number | null;
          input_tokens?: number;
          output_tokens?: number;
          image_count?: number;
          est_cost_usd?: number;
          prompt_chars?: number | null;
          error_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          feature?: "copy" | "image";
          provider?: string;
          model?: string;
          status?: "ok" | "error" | "denied";
          http_status?: number | null;
          input_tokens?: number;
          output_tokens?: number;
          image_count?: number;
          est_cost_usd?: number;
          prompt_chars?: number | null;
          error_code?: string | null;
          created_at?: string;
        };
      };
      // ----- Personas / ICPs (migration 0004) -----
      personas: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          demographics: string | null;
          desires: string;
          problems: string;
          voice_of_customer: string;
          notes: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          demographics?: string | null;
          desires?: string;
          problems?: string;
          voice_of_customer?: string;
          notes?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          demographics?: string | null;
          desires?: string;
          problems?: string;
          voice_of_customer?: string;
          notes?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      user_usage_monthly: {
        Row: {
          user_id: string;
          month: string;
          feature: "copy" | "image";
          requests: number;
          images: number;
          input_tokens: number;
          output_tokens: number;
          est_cost_usd: number;
        };
      };
    };
    Functions: {
      vault_read_secret: {
        Args: { secret_id: string };
        Returns: { secret: string }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
