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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          account_number: string | null
          account_type: string
          bank: string
          cedula: string
          created_at: string
          holder_name: string
          id: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string
          bank: string
          cedula: string
          created_at?: string
          holder_name: string
          id?: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          account_type?: string
          bank?: string
          cedula?: string
          created_at?: string
          holder_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      community_fund: {
        Row: {
          id: number
          total: number
          updated_at: string
        }
        Insert: {
          id?: number
          total?: number
          updated_at?: string
        }
        Update: {
          id?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      gift_code_claims: {
        Row: {
          amount: number
          code_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          code_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          code_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_code_claims_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "gift_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_codes: {
        Row: {
          active: boolean
          amount: number
          claim_limit: number
          claims_count: number
          code: string
          created_at: string
          created_by: string | null
          id: string
        }
        Insert: {
          active?: boolean
          amount: number
          claim_limit: number
          claims_count?: number
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Update: {
          active?: boolean
          amount?: number
          claim_limit?: number
          claims_count?: number
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          active: boolean
          id: string
          last_payout_at: string
          payouts_made: number
          plan_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          id?: string
          last_payout_at?: string
          payouts_made?: number
          plan_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          id?: string
          last_payout_at?: string
          payouts_made?: number
          plan_id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          cycle_days: number
          daily_profit_pct: number
          hidden: boolean
          id: string
          image_url: string | null
          name: string
          price: number
          sort_order: number
          wattage: number | null
        }
        Insert: {
          cycle_days?: number
          daily_profit_pct?: number
          hidden?: boolean
          id?: string
          image_url?: string | null
          name: string
          price: number
          sort_order?: number
          wattage?: number | null
        }
        Update: {
          cycle_days?: number
          daily_profit_pct?: number
          hidden?: boolean
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          sort_order?: number
          wattage?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance: number
          created_at: string
          email: string
          id: string
          invitation_code: string
          referred_by: string | null
          total_recharged: number
          total_withdrawn: number
          username: string
        }
        Insert: {
          balance?: number
          created_at?: string
          email: string
          id: string
          invitation_code: string
          referred_by?: string | null
          total_recharged?: number
          total_withdrawn?: number
          username: string
        }
        Update: {
          balance?: number
          created_at?: string
          email?: string
          id?: string
          invitation_code?: string
          referred_by?: string | null
          total_recharged?: number
          total_withdrawn?: number
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recharge_requests: {
        Row: {
          amount: number | null
          cedula: string | null
          created_at: string
          holder_name: string | null
          id: string
          processed_at: string | null
          receipt_url: string | null
          reference: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          cedula?: string | null
          created_at?: string
          holder_name?: string | null
          id?: string
          processed_at?: string | null
          receipt_url?: string | null
          reference?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          cedula?: string | null
          created_at?: string
          holder_name?: string | null
          id?: string
          processed_at?: string | null
          receipt_url?: string | null
          reference?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_pins: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          pin: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          pin: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          pin?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string
          id: string
          net_amount: number | null
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string
          id?: string
          net_amount?: number | null
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string
          id?: string
          net_amount?: number | null
          processed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_activate_investment: {
        Args: { _inv_id: string }
        Returns: undefined
      }
      admin_adjust_balance: {
        Args: { _delta: number; _note: string; _user_id: string }
        Returns: undefined
      }
      admin_approve_recharge: { Args: { _req_id: string }; Returns: undefined }
      admin_approve_withdrawal: {
        Args: { _req_id: string }
        Returns: undefined
      }
      admin_create_gift_code: {
        Args: { _amount: number; _claim_limit: number; _code: string }
        Returns: string
      }
      admin_force_expire_investment: {
        Args: { _inv_id: string }
        Returns: undefined
      }
      admin_list_investments: {
        Args: never
        Returns: {
          active: boolean
          cycle_days: number
          days_remaining: number
          email: string
          id: string
          payouts_made: number
          plan_id: string
          plan_name: string
          plan_price: number
          purchased_at: string
          user_id: string
          username: string
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          balance: number
          created_at: string
          email: string
          id: string
          invitation_code: string
          referred_by: string
          total_recharged: number
          total_withdrawn: number
          username: string
        }[]
      }
      admin_reject_recharge: { Args: { _req_id: string }; Returns: undefined }
      admin_reject_withdrawal: { Args: { _req_id: string }; Returns: undefined }
      admin_toggle_gift_code: {
        Args: { _active: boolean; _code_id: string }
        Returns: undefined
      }
      admin_update_gift_code_limit: {
        Args: { _code_id: string; _new_limit: number }
        Returns: undefined
      }
      admin_user_transactions: {
        Args: { _user_id: string }
        Returns: {
          amount: number
          created_at: string
          description: string | null
          id: string
          kind: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_gift_code: { Args: { _code: string }; Returns: number }
      create_withdrawal: {
        Args: { _amount: number; _bank_account_id: string; _pin: string }
        Returns: string
      }
      generate_withdrawal_pin: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_due_payouts: { Args: { _user_id: string }; Returns: undefined }
      purchase_plan: { Args: { _plan_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
