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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      advisor_client_invitations: {
        Row: {
          advisor_id: string
          client_email: string
          client_user_id: string | null
          created_at: string | null
          expires_at: string
          id: string
          invitation_type: string
          message: string | null
          responded_at: string | null
          status: string
          token: string
        }
        Insert: {
          advisor_id: string
          client_email: string
          client_user_id?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          invitation_type: string
          message?: string | null
          responded_at?: string | null
          status?: string
          token?: string
        }
        Update: {
          advisor_id?: string
          client_email?: string
          client_user_id?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          invitation_type?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          token?: string
        }
        Relationships: []
      }
      alert_history: {
        Row: {
          alert_id: string | null
          alert_type: string
          created_at: string | null
          id: string
          notification_sent: boolean | null
          ticker: string | null
          trigger_details: Json | null
          trigger_value: number | null
          triggered_at: string | null
          user_id: string
          whatsapp_sent: boolean | null
        }
        Insert: {
          alert_id?: string | null
          alert_type: string
          created_at?: string | null
          id?: string
          notification_sent?: boolean | null
          ticker?: string | null
          trigger_details?: Json | null
          trigger_value?: number | null
          triggered_at?: string | null
          user_id: string
          whatsapp_sent?: boolean | null
        }
        Update: {
          alert_id?: string | null
          alert_type?: string
          created_at?: string | null
          id?: string
          notification_sent?: boolean | null
          ticker?: string | null
          trigger_details?: Json | null
          trigger_value?: number | null
          triggered_at?: string | null
          user_id?: string
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_history_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          alert_type: string
          comparison_type: string | null
          created_at: string | null
          frequency: string | null
          goal_id: string | null
          id: string
          is_active: boolean | null
          last_triggered: string | null
          notification_method: string | null
          target_price: number | null
          threshold_value: number | null
          ticker: string
          trigger_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          comparison_type?: string | null
          created_at?: string | null
          frequency?: string | null
          goal_id?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered?: string | null
          notification_method?: string | null
          target_price?: number | null
          threshold_value?: number | null
          ticker: string
          trigger_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          comparison_type?: string | null
          created_at?: string | null
          frequency?: string | null
          goal_id?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered?: string | null
          notification_method?: string | null
          target_price?: number | null
          threshold_value?: number | null
          ticker?: string
          trigger_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "financial_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_fundamentals: {
        Row: {
          asset_class: string
          cagr_lucros_5a: number | null
          cagr_receitas_5a: number | null
          cash_and_equivalents: number | null
          created_at: string | null
          current_price: number | null
          data_source: string | null
          div_liquida_ebitda: number | null
          dividend_yield: number | null
          dividends_paid: number | null
          ebit: number | null
          ebit_margin: number | null
          ebitda: number | null
          ebitda_margin: number | null
          ev_ebitda: number | null
          financial_type: string | null
          format_flags: Json | null
          gross_margin: number | null
          gross_profit: number | null
          id: string
          is_financial: boolean | null
          liq_corrente: number | null
          net_debt: number | null
          net_income: number | null
          net_margin: number | null
          p_l: number | null
          p_vp: number | null
          payout_ratio: number | null
          revenue: number | null
          roa: number | null
          roe: number | null
          roic: number | null
          ticker: string
          total_assets: number | null
          total_debt: number | null
          total_equity: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          asset_class: string
          cagr_lucros_5a?: number | null
          cagr_receitas_5a?: number | null
          cash_and_equivalents?: number | null
          created_at?: string | null
          current_price?: number | null
          data_source?: string | null
          div_liquida_ebitda?: number | null
          dividend_yield?: number | null
          dividends_paid?: number | null
          ebit?: number | null
          ebit_margin?: number | null
          ebitda?: number | null
          ebitda_margin?: number | null
          ev_ebitda?: number | null
          financial_type?: string | null
          format_flags?: Json | null
          gross_margin?: number | null
          gross_profit?: number | null
          id?: string
          is_financial?: boolean | null
          liq_corrente?: number | null
          net_debt?: number | null
          net_income?: number | null
          net_margin?: number | null
          p_l?: number | null
          p_vp?: number | null
          payout_ratio?: number | null
          revenue?: number | null
          roa?: number | null
          roe?: number | null
          roic?: number | null
          ticker: string
          total_assets?: number | null
          total_debt?: number | null
          total_equity?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          asset_class?: string
          cagr_lucros_5a?: number | null
          cagr_receitas_5a?: number | null
          cash_and_equivalents?: number | null
          created_at?: string | null
          current_price?: number | null
          data_source?: string | null
          div_liquida_ebitda?: number | null
          dividend_yield?: number | null
          dividends_paid?: number | null
          ebit?: number | null
          ebit_margin?: number | null
          ebitda?: number | null
          ebitda_margin?: number | null
          ev_ebitda?: number | null
          financial_type?: string | null
          format_flags?: Json | null
          gross_margin?: number | null
          gross_profit?: number | null
          id?: string
          is_financial?: boolean | null
          liq_corrente?: number | null
          net_debt?: number | null
          net_income?: number | null
          net_margin?: number | null
          p_l?: number | null
          p_vp?: number | null
          payout_ratio?: number | null
          revenue?: number | null
          roa?: number | null
          roe?: number | null
          roic?: number | null
          ticker?: string
          total_assets?: number | null
          total_debt?: number | null
          total_equity?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      asset_class_definitions: {
        Row: {
          class_name: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          class_name: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          class_name?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      asset_subclass_definitions: {
        Row: {
          class_id: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          subclass_name: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          subclass_name: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          subclass_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_subclass_definitions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "asset_class_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_valuations: {
        Row: {
          confidence_level: string | null
          created_at: string | null
          estimated_value: number
          id: string
          patrimony_asset_id: string
          raw_data: Json | null
          valuation_date: string
          valuation_source: string
        }
        Insert: {
          confidence_level?: string | null
          created_at?: string | null
          estimated_value: number
          id?: string
          patrimony_asset_id: string
          raw_data?: Json | null
          valuation_date: string
          valuation_source: string
        }
        Update: {
          confidence_level?: string | null
          created_at?: string | null
          estimated_value?: number
          id?: string
          patrimony_asset_id?: string
          raw_data?: Json | null
          valuation_date?: string
          valuation_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_valuations_patrimony_asset_id_fkey"
            columns: ["patrimony_asset_id"]
            isOneToOne: false
            referencedRelation: "patrimony_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_value_history: {
        Row: {
          asset_id: string
          created_at: string | null
          cumulative_return_percent: number | null
          daily_return_percent: number | null
          id: string
          reference_date: string
          user_id: string
          value_accrual: number
          value_market: number | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          cumulative_return_percent?: number | null
          daily_return_percent?: number | null
          id?: string
          reference_date: string
          user_id: string
          value_accrual: number
          value_market?: number | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          cumulative_return_percent?: number | null
          daily_return_percent?: number | null
          id?: string
          reference_date?: string
          user_id?: string
          value_accrual?: number
          value_market?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_value_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          application_date: string | null
          asset_class: string
          asset_name: string
          average_price: number
          broker: string | null
          client_id: string | null
          cnpj: string | null
          created_at: string | null
          currency: string | null
          current_price: number | null
          id: string
          invested_amount: number | null
          market_region: string | null
          maturity_date: string | null
          quantity: number
          rate: string | null
          sector: string | null
          sub_class: string | null
          ticker: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          application_date?: string | null
          asset_class: string
          asset_name: string
          average_price?: number
          broker?: string | null
          client_id?: string | null
          cnpj?: string | null
          created_at?: string | null
          currency?: string | null
          current_price?: number | null
          id?: string
          invested_amount?: number | null
          market_region?: string | null
          maturity_date?: string | null
          quantity?: number
          rate?: string | null
          sector?: string | null
          sub_class?: string | null
          ticker: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          application_date?: string | null
          asset_class?: string
          asset_name?: string
          average_price?: number
          broker?: string | null
          client_id?: string | null
          cnpj?: string | null
          created_at?: string | null
          currency?: string | null
          current_price?: number | null
          id?: string
          invested_amount?: number | null
          market_region?: string | null
          maturity_date?: string | null
          quantity?: number
          rate?: string | null
          sector?: string | null
          sub_class?: string | null
          ticker?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      authorized_organization_emails: {
        Row: {
          created_at: string | null
          email: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authorized_organization_emails_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_sheets: {
        Row: {
          accounts_receivable: number | null
          cash_and_equivalents: number | null
          created_at: string | null
          current_assets: number | null
          current_liabilities: number | null
          id: string
          inventory: number | null
          long_term_debt: number | null
          period_end: string
          period_type: string
          retained_earnings: number | null
          short_term_debt: number | null
          ticker: string
          total_assets: number | null
          total_equity: number | null
          total_liabilities: number | null
          updated_at: string | null
        }
        Insert: {
          accounts_receivable?: number | null
          cash_and_equivalents?: number | null
          created_at?: string | null
          current_assets?: number | null
          current_liabilities?: number | null
          id?: string
          inventory?: number | null
          long_term_debt?: number | null
          period_end: string
          period_type: string
          retained_earnings?: number | null
          short_term_debt?: number | null
          ticker: string
          total_assets?: number | null
          total_equity?: number | null
          total_liabilities?: number | null
          updated_at?: string | null
        }
        Update: {
          accounts_receivable?: number | null
          cash_and_equivalents?: number | null
          created_at?: string | null
          current_assets?: number | null
          current_liabilities?: number | null
          id?: string
          inventory?: number | null
          long_term_debt?: number | null
          period_end?: string
          period_type?: string
          retained_earnings?: number | null
          short_term_debt?: number | null
          ticker?: string
          total_assets?: number | null
          total_equity?: number | null
          total_liabilities?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      benchmark_data: {
        Row: {
          benchmark_type: string
          created_at: string | null
          date: string
          id: string
          updated_at: string | null
          value: number
        }
        Insert: {
          benchmark_type: string
          created_at?: string | null
          date: string
          id?: string
          updated_at?: string | null
          value: number
        }
        Update: {
          benchmark_type?: string
          created_at?: string | null
          date?: string
          id?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: []
      }
      brazilian_holidays: {
        Row: {
          created_at: string | null
          description: string | null
          holiday_date: string
          id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          holiday_date: string
          id?: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          holiday_date?: string
          id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          id: string
          month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          id?: string
          month: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flows: {
        Row: {
          capital_expenditure: number | null
          created_at: string | null
          dividends_paid: number | null
          financing_cash_flow: number | null
          free_cash_flow: number | null
          id: string
          investing_cash_flow: number | null
          net_change_in_cash: number | null
          operating_cash_flow: number | null
          period_end: string
          period_type: string
          ticker: string
          updated_at: string | null
        }
        Insert: {
          capital_expenditure?: number | null
          created_at?: string | null
          dividends_paid?: number | null
          financing_cash_flow?: number | null
          free_cash_flow?: number | null
          id?: string
          investing_cash_flow?: number | null
          net_change_in_cash?: number | null
          operating_cash_flow?: number | null
          period_end: string
          period_type: string
          ticker: string
          updated_at?: string | null
        }
        Update: {
          capital_expenditure?: number | null
          created_at?: string | null
          dividends_paid?: number | null
          financing_cash_flow?: number | null
          free_cash_flow?: number | null
          id?: string
          investing_cash_flow?: number | null
          net_change_in_cash?: number | null
          operating_cash_flow?: number | null
          period_end?: string
          period_type?: string
          ticker?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_actions: {
        Row: {
          action_type: string
          advisor_id: string
          client_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          action_type: string
          advisor_id: string
          client_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          advisor_id?: string
          client_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_actions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_advisor_links: {
        Row: {
          advisor_id: string
          client_id: string
          created_at: string | null
          id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          advisor_id: string
          client_id: string
          created_at?: string | null
          id?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          advisor_id?: string
          client_id?: string
          created_at?: string | null
          id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      client_health_scores: {
        Row: {
          advisor_id: string
          calculated_at: string
          client_id: string
          created_at: string
          diversification_score: number | null
          engagement_score: number | null
          id: string
          insights: Json | null
          overall_score: number
          portfolio_health: number | null
          recommendations: Json | null
          risk_alignment: number | null
        }
        Insert: {
          advisor_id: string
          calculated_at?: string
          client_id: string
          created_at?: string
          diversification_score?: number | null
          engagement_score?: number | null
          id?: string
          insights?: Json | null
          overall_score: number
          portfolio_health?: number | null
          recommendations?: Json | null
          risk_alignment?: number | null
        }
        Update: {
          advisor_id?: string
          calculated_at?: string
          client_id?: string
          created_at?: string
          diversification_score?: number | null
          engagement_score?: number | null
          id?: string
          insights?: Json | null
          overall_score?: number
          portfolio_health?: number | null
          recommendations?: Json | null
          risk_alignment?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_health_scores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portfolio_snapshots: {
        Row: {
          advisor_id: string
          assets_snapshot: Json
          client_id: string
          created_at: string | null
          id: string
          snapshot_date: string
          total_value: number
        }
        Insert: {
          advisor_id: string
          assets_snapshot: Json
          client_id: string
          created_at?: string | null
          id?: string
          snapshot_date?: string
          total_value?: number
        }
        Update: {
          advisor_id?: string
          assets_snapshot?: Json
          client_id?: string
          created_at?: string | null
          id?: string
          snapshot_date?: string
          total_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_portfolio_snapshots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          advisor_id: string
          contact_frequency: string | null
          created_at: string | null
          email: string | null
          id: string
          investment_objectives: string | null
          last_portfolio_update: string | null
          monthly_income: number | null
          name: string
          notes: string | null
          onboarding_date: string | null
          organization_id: string | null
          phone: string | null
          portfolio_value: number | null
          risk_profile: string | null
          status: string | null
          suitability: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          advisor_id: string
          contact_frequency?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          investment_objectives?: string | null
          last_portfolio_update?: string | null
          monthly_income?: number | null
          name: string
          notes?: string | null
          onboarding_date?: string | null
          organization_id?: string | null
          phone?: string | null
          portfolio_value?: number | null
          risk_profile?: string | null
          status?: string | null
          suitability?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          advisor_id?: string
          contact_frequency?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          investment_objectives?: string | null
          last_portfolio_update?: string | null
          monthly_income?: number | null
          name?: string
          notes?: string | null
          onboarding_date?: string | null
          organization_id?: string | null
          phone?: string | null
          portfolio_value?: number | null
          risk_profile?: string | null
          status?: string | null
          suitability?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_events: {
        Row: {
          announcement_date: string
          created_at: string | null
          deadline_date: string | null
          description: string | null
          document_url: string | null
          event_subtype: string | null
          event_type: string
          ex_date: string | null
          id: string
          payment_date: string | null
          ratio: string | null
          raw_data: Json | null
          source: string | null
          ticker: string
          title: string
          value_per_share: number | null
        }
        Insert: {
          announcement_date: string
          created_at?: string | null
          deadline_date?: string | null
          description?: string | null
          document_url?: string | null
          event_subtype?: string | null
          event_type: string
          ex_date?: string | null
          id?: string
          payment_date?: string | null
          ratio?: string | null
          raw_data?: Json | null
          source?: string | null
          ticker: string
          title: string
          value_per_share?: number | null
        }
        Update: {
          announcement_date?: string
          created_at?: string | null
          deadline_date?: string | null
          description?: string | null
          document_url?: string | null
          event_subtype?: string | null
          event_type?: string
          ex_date?: string | null
          id?: string
          payment_date?: string | null
          ratio?: string | null
          raw_data?: Json | null
          source?: string | null
          ticker?: string
          title?: string
          value_per_share?: number | null
        }
        Relationships: []
      }
      course_lessons: {
        Row: {
          content: string | null
          course_id: string
          created_at: string | null
          duration: number | null
          id: string
          is_free_preview: boolean | null
          order_index: number
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string | null
          duration?: number | null
          id?: string
          is_free_preview?: boolean | null
          order_index: number
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string | null
          duration?: number | null
          id?: string
          is_free_preview?: boolean | null
          order_index?: number
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "educational_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_asset_subclasses: {
        Row: {
          asset_class: string
          created_at: string
          id: string
          sub_class_name: string
          user_id: string
        }
        Insert: {
          asset_class: string
          created_at?: string
          id?: string
          sub_class_name: string
          user_id: string
        }
        Update: {
          asset_class?: string
          created_at?: string
          id?: string
          sub_class_name?: string
          user_id?: string
        }
        Relationships: []
      }
      data_subject_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          status: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deal_pipeline: {
        Row: {
          advisor_id: string
          client_id: string
          created_at: string
          deal_name: string
          deal_value: number | null
          expected_close_date: string | null
          id: string
          notes: string | null
          probability: number | null
          stage: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          client_id: string
          created_at?: string
          deal_name: string
          deal_value?: number | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          probability?: number | null
          stage?: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          client_id?: string
          created_at?: string
          deal_name?: string
          deal_value?: number | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          probability?: number | null
          stage?: string
          updated_at?: string
        }
        Relationships: []
      }
      dividends: {
        Row: {
          amount: number
          asset_class: string | null
          asset_id: string | null
          client_id: string | null
          created_at: string | null
          dividend_type: string | null
          ex_date: string | null
          id: string
          market_type: string | null
          payment_date: string
          ticker: string
          user_id: string
        }
        Insert: {
          amount: number
          asset_class?: string | null
          asset_id?: string | null
          client_id?: string | null
          created_at?: string | null
          dividend_type?: string | null
          ex_date?: string | null
          id?: string
          market_type?: string | null
          payment_date: string
          ticker: string
          user_id: string
        }
        Update: {
          amount?: number
          asset_class?: string | null
          asset_id?: string | null
          client_id?: string | null
          created_at?: string | null
          dividend_type?: string | null
          ex_date?: string | null
          id?: string
          market_type?: string | null
          payment_date?: string
          ticker?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dividends_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dividends_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      economic_indicators: {
        Row: {
          annual_rate: number | null
          created_at: string | null
          daily_rate: number | null
          id: string
          indicator_type: string
          monthly_rate: number | null
          reference_date: string
        }
        Insert: {
          annual_rate?: number | null
          created_at?: string | null
          daily_rate?: number | null
          id?: string
          indicator_type: string
          monthly_rate?: number | null
          reference_date: string
        }
        Update: {
          annual_rate?: number | null
          created_at?: string | null
          daily_rate?: number | null
          id?: string
          indicator_type?: string
          monthly_rate?: number | null
          reference_date?: string
        }
        Relationships: []
      }
      educational_articles: {
        Row: {
          author_name: string | null
          category: string
          content: string
          created_at: string | null
          difficulty_level: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          published_at: string | null
          reading_time: number | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_name?: string | null
          category: string
          content: string
          created_at?: string | null
          difficulty_level?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          published_at?: string | null
          reading_time?: number | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_name?: string | null
          category?: string
          content?: string
          created_at?: string | null
          difficulty_level?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          published_at?: string | null
          reading_time?: number | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      educational_courses: {
        Row: {
          category: string
          created_at: string | null
          description: string
          detailed_description: string | null
          difficulty_level: string | null
          estimated_hours: number | null
          id: string
          instructor_name: string | null
          is_featured: boolean | null
          is_published: boolean | null
          price: number | null
          slug: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          total_lessons: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          detailed_description?: string | null
          difficulty_level?: string | null
          estimated_hours?: number | null
          id?: string
          instructor_name?: string | null
          is_featured?: boolean | null
          is_published?: boolean | null
          price?: number | null
          slug: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          total_lessons?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          detailed_description?: string | null
          difficulty_level?: string | null
          estimated_hours?: number | null
          id?: string
          instructor_name?: string | null
          is_featured?: boolean | null
          is_published?: boolean | null
          price?: number | null
          slug?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          total_lessons?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      educational_quizzes: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          id: string
          is_active: boolean | null
          passing_score: number | null
          time_limit: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          id?: string
          is_active?: boolean | null
          passing_score?: number | null
          time_limit?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          id?: string
          is_active?: boolean | null
          passing_score?: number | null
          time_limit?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      educational_videos: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          duration: number | null
          id: string
          instructor_name: string | null
          is_featured: boolean | null
          published_at: string | null
          slug: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_url: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration?: number | null
          id?: string
          instructor_name?: string | null
          is_featured?: boolean | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_url: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration?: number | null
          id?: string
          instructor_name?: string | null
          is_featured?: boolean | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string | null
          email_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          description: string | null
          html_content: string
          id: string
          is_active: boolean
          name: string
          subject: string
          template_key: string
          updated_at: string
          variables: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          html_content: string
          id?: string
          is_active?: boolean
          name: string
          subject: string
          template_key: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          template_key?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      email_verifications: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          token: string
          user_id: string
          verification_type: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          token: string
          user_id: string
          verification_type: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
          verification_type?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      fii_dividends: {
        Row: {
          created_at: string
          data_base: string | null
          data_declaracao: string | null
          data_pagamento: string | null
          id: string
          source: string | null
          ticker: string
          tipo: string | null
          valor_por_cota: number
        }
        Insert: {
          created_at?: string
          data_base?: string | null
          data_declaracao?: string | null
          data_pagamento?: string | null
          id?: string
          source?: string | null
          ticker: string
          tipo?: string | null
          valor_por_cota: number
        }
        Update: {
          created_at?: string
          data_base?: string | null
          data_declaracao?: string | null
          data_pagamento?: string | null
          id?: string
          source?: string | null
          ticker?: string
          tipo?: string | null
          valor_por_cota?: number
        }
        Relationships: []
      }
      fii_dividends_history: {
        Row: {
          created_at: string | null
          dividend_rate: number
          id: string
          payment_date: string
          price_at_date: number | null
          ticker: string
          yield_percent: number | null
        }
        Insert: {
          created_at?: string | null
          dividend_rate: number
          id?: string
          payment_date: string
          price_at_date?: number | null
          ticker: string
          yield_percent?: number | null
        }
        Update: {
          created_at?: string | null
          dividend_rate?: number
          id?: string
          payment_date?: string
          price_at_date?: number | null
          ticker?: string
          yield_percent?: number | null
        }
        Relationships: []
      }
      fii_metrics: {
        Row: {
          administrador: string | null
          cnpj_fundo: string | null
          created_at: string
          data_referencia: string
          gestor: string | null
          id: string
          nome_fundo: string | null
          num_cotas_emitidas: number | null
          num_cotistas: number | null
          patrimonio_liquido: number | null
          rentabilidade_patrimonio: number | null
          segmento: string | null
          taxa_inadimplencia: number | null
          taxa_vacancia: number | null
          ticker: string
          tipo_fii: string | null
          updated_at: string
          valor_patrimonial_cota: number | null
        }
        Insert: {
          administrador?: string | null
          cnpj_fundo?: string | null
          created_at?: string
          data_referencia: string
          gestor?: string | null
          id?: string
          nome_fundo?: string | null
          num_cotas_emitidas?: number | null
          num_cotistas?: number | null
          patrimonio_liquido?: number | null
          rentabilidade_patrimonio?: number | null
          segmento?: string | null
          taxa_inadimplencia?: number | null
          taxa_vacancia?: number | null
          ticker: string
          tipo_fii?: string | null
          updated_at?: string
          valor_patrimonial_cota?: number | null
        }
        Update: {
          administrador?: string | null
          cnpj_fundo?: string | null
          created_at?: string
          data_referencia?: string
          gestor?: string | null
          id?: string
          nome_fundo?: string | null
          num_cotas_emitidas?: number | null
          num_cotistas?: number | null
          patrimonio_liquido?: number | null
          rentabilidade_patrimonio?: number | null
          segmento?: string | null
          taxa_inadimplencia?: number | null
          taxa_vacancia?: number | null
          ticker?: string
          tipo_fii?: string | null
          updated_at?: string
          valor_patrimonial_cota?: number | null
        }
        Relationships: []
      }
      fii_registry: {
        Row: {
          cnpj: string
          created_at: string
          id: string
          nome_fundo: string | null
          segmento: string | null
          ticker: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          id?: string
          nome_fundo?: string | null
          segmento?: string | null
          ticker: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          id?: string
          nome_fundo?: string | null
          segmento?: string | null
          ticker?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fii_relevant_facts: {
        Row: {
          created_at: string
          data_publicacao: string
          id: string
          resumo: string | null
          ticker: string
          titulo: string
          url_documento: string | null
        }
        Insert: {
          created_at?: string
          data_publicacao: string
          id?: string
          resumo?: string | null
          ticker: string
          titulo: string
          url_documento?: string | null
        }
        Update: {
          created_at?: string
          data_publicacao?: string
          id?: string
          resumo?: string | null
          ticker?: string
          titulo?: string
          url_documento?: string | null
        }
        Relationships: []
      }
      financial_goals: {
        Row: {
          client_id: string | null
          created_at: string
          current_amount: number | null
          deadline: string | null
          description: string | null
          goal_type: string
          icon: string | null
          id: string
          priority: number | null
          status: string
          target_amount: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          current_amount?: number | null
          deadline?: string | null
          description?: string | null
          goal_type?: string
          icon?: string | null
          id?: string
          priority?: number | null
          status?: string
          target_amount: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          current_amount?: number | null
          deadline?: string | null
          description?: string | null
          goal_type?: string
          icon?: string | null
          id?: string
          priority?: number | null
          status?: string
          target_amount?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_plans: {
        Row: {
          advisor_id: string
          client_id: string | null
          created_at: string | null
          description: string | null
          id: string
          linked_user_id: string | null
          parameters: Json
          plan_type: string
          recommendations: Json | null
          reviewed_by_client_at: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          advisor_id: string
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          linked_user_id?: string | null
          parameters?: Json
          plan_type: string
          recommendations?: Json | null
          reviewed_by_client_at?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          advisor_id?: string
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          linked_user_id?: string | null
          parameters?: Json
          plan_type?: string
          recommendations?: Json | null
          reviewed_by_client_at?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_quotes: {
        Row: {
          captacao_dia: number | null
          cnpj: string
          created_at: string | null
          data_quota: string
          id: string
          nome_fundo: string | null
          numero_cotistas: number | null
          patrimonio_liquido: number | null
          resgate_dia: number | null
          valor_quota: number
        }
        Insert: {
          captacao_dia?: number | null
          cnpj: string
          created_at?: string | null
          data_quota: string
          id?: string
          nome_fundo?: string | null
          numero_cotistas?: number | null
          patrimonio_liquido?: number | null
          resgate_dia?: number | null
          valor_quota: number
        }
        Update: {
          captacao_dia?: number | null
          cnpj?: string
          created_at?: string | null
          data_quota?: string
          id?: string
          nome_fundo?: string | null
          numero_cotistas?: number | null
          patrimonio_liquido?: number | null
          resgate_dia?: number | null
          valor_quota?: number
        }
        Relationships: []
      }
      fundamental_data: {
        Row: {
          annual_dividend: number | null
          asset_class: string
          aum: number | null
          avg_volume: number | null
          cagr_lucros_5: number | null
          cagr_receitas_5: number | null
          created_at: string | null
          current_price: number | null
          data_source: string | null
          data_ultimo_dividendo: string | null
          day_change_percent: number | null
          div_liquida_ebit: number | null
          div_liquida_ebitda: number | null
          div_liquida_pl: number | null
          dividend_yield: number | null
          dividends_summary: Json | null
          dy: number | null
          ev_ebitda: number | null
          expense_ratio: number | null
          financial_type: string | null
          format_flags: Json | null
          giro_ativos: number | null
          id: string
          is_financial: boolean | null
          last_updated: string | null
          liq_corrente: number | null
          liquidez_media_diaria: number | null
          m_bruta: number | null
          m_ebit: number | null
          m_ebitda: number | null
          m_liquida: number | null
          market_cap: number | null
          p_ativo: number | null
          p_ativo_circ_liq: number | null
          p_cap_giro: number | null
          p_ebit: number | null
          p_ebitda: number | null
          p_l: number | null
          p_vp: number | null
          passivo_ativo: number | null
          patrimonio_liquido: number | null
          payout_ratio: number | null
          pb_ratio: number | null
          pe_ratio: number | null
          peg_ratio: number | null
          pl_ativo: number | null
          previous_close: number | null
          profit_margin: number | null
          rentabilidade_mes: number | null
          roa: number | null
          roa_percent: number | null
          roe: number | null
          roe_percent: number | null
          roic: number | null
          ticker: string
          ultimo_dividendo: number | null
          ultimo_rendimento: number | null
          updated_at: string | null
          vacancia: number | null
          valor_patrimonial: number | null
          vpa: number | null
          week_52_high: number | null
          week_52_low: number | null
        }
        Insert: {
          annual_dividend?: number | null
          asset_class: string
          aum?: number | null
          avg_volume?: number | null
          cagr_lucros_5?: number | null
          cagr_receitas_5?: number | null
          created_at?: string | null
          current_price?: number | null
          data_source?: string | null
          data_ultimo_dividendo?: string | null
          day_change_percent?: number | null
          div_liquida_ebit?: number | null
          div_liquida_ebitda?: number | null
          div_liquida_pl?: number | null
          dividend_yield?: number | null
          dividends_summary?: Json | null
          dy?: number | null
          ev_ebitda?: number | null
          expense_ratio?: number | null
          financial_type?: string | null
          format_flags?: Json | null
          giro_ativos?: number | null
          id?: string
          is_financial?: boolean | null
          last_updated?: string | null
          liq_corrente?: number | null
          liquidez_media_diaria?: number | null
          m_bruta?: number | null
          m_ebit?: number | null
          m_ebitda?: number | null
          m_liquida?: number | null
          market_cap?: number | null
          p_ativo?: number | null
          p_ativo_circ_liq?: number | null
          p_cap_giro?: number | null
          p_ebit?: number | null
          p_ebitda?: number | null
          p_l?: number | null
          p_vp?: number | null
          passivo_ativo?: number | null
          patrimonio_liquido?: number | null
          payout_ratio?: number | null
          pb_ratio?: number | null
          pe_ratio?: number | null
          peg_ratio?: number | null
          pl_ativo?: number | null
          previous_close?: number | null
          profit_margin?: number | null
          rentabilidade_mes?: number | null
          roa?: number | null
          roa_percent?: number | null
          roe?: number | null
          roe_percent?: number | null
          roic?: number | null
          ticker: string
          ultimo_dividendo?: number | null
          ultimo_rendimento?: number | null
          updated_at?: string | null
          vacancia?: number | null
          valor_patrimonial?: number | null
          vpa?: number | null
          week_52_high?: number | null
          week_52_low?: number | null
        }
        Update: {
          annual_dividend?: number | null
          asset_class?: string
          aum?: number | null
          avg_volume?: number | null
          cagr_lucros_5?: number | null
          cagr_receitas_5?: number | null
          created_at?: string | null
          current_price?: number | null
          data_source?: string | null
          data_ultimo_dividendo?: string | null
          day_change_percent?: number | null
          div_liquida_ebit?: number | null
          div_liquida_ebitda?: number | null
          div_liquida_pl?: number | null
          dividend_yield?: number | null
          dividends_summary?: Json | null
          dy?: number | null
          ev_ebitda?: number | null
          expense_ratio?: number | null
          financial_type?: string | null
          format_flags?: Json | null
          giro_ativos?: number | null
          id?: string
          is_financial?: boolean | null
          last_updated?: string | null
          liq_corrente?: number | null
          liquidez_media_diaria?: number | null
          m_bruta?: number | null
          m_ebit?: number | null
          m_ebitda?: number | null
          m_liquida?: number | null
          market_cap?: number | null
          p_ativo?: number | null
          p_ativo_circ_liq?: number | null
          p_cap_giro?: number | null
          p_ebit?: number | null
          p_ebitda?: number | null
          p_l?: number | null
          p_vp?: number | null
          passivo_ativo?: number | null
          patrimonio_liquido?: number | null
          payout_ratio?: number | null
          pb_ratio?: number | null
          pe_ratio?: number | null
          peg_ratio?: number | null
          pl_ativo?: number | null
          previous_close?: number | null
          profit_margin?: number | null
          rentabilidade_mes?: number | null
          roa?: number | null
          roa_percent?: number | null
          roe?: number | null
          roe_percent?: number | null
          roic?: number | null
          ticker?: string
          ultimo_dividendo?: number | null
          ultimo_rendimento?: number | null
          updated_at?: string | null
          vacancia?: number | null
          valor_patrimonial?: number | null
          vpa?: number | null
          week_52_high?: number | null
          week_52_low?: number | null
        }
        Relationships: []
      }
      goal_portfolio_mappings: {
        Row: {
          allocation_percentage: number | null
          asset_class: string | null
          asset_id: string | null
          created_at: string | null
          goal_id: string
          id: string
          notes: string | null
          sub_class: string | null
          user_id: string
        }
        Insert: {
          allocation_percentage?: number | null
          asset_class?: string | null
          asset_id?: string | null
          created_at?: string | null
          goal_id: string
          id?: string
          notes?: string | null
          sub_class?: string | null
          user_id: string
        }
        Update: {
          allocation_percentage?: number | null
          asset_class?: string | null
          asset_id?: string | null
          created_at?: string | null
          goal_id?: string
          id?: string
          notes?: string | null
          sub_class?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_portfolio_mappings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_portfolio_mappings_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "financial_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_progress_history: {
        Row: {
          amount: number
          goal_id: string
          id: string
          recorded_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          goal_id: string
          id?: string
          recorded_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          goal_id?: string
          id?: string
          recorded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_progress_history_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "financial_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_tokens: {
        Row: {
          admin_id: string
          created_at: string | null
          expires_at: string
          id: string
          target_user_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          target_user_id: string
          token: string
          used_at?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          target_user_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      income_statements: {
        Row: {
          cost_of_revenue: number | null
          created_at: string | null
          earnings_per_share: number | null
          ebit: number | null
          ebitda: number | null
          gross_margin: number | null
          gross_profit: number | null
          id: string
          net_income: number | null
          net_margin: number | null
          operating_expenses: number | null
          operating_income: number | null
          operating_margin: number | null
          period_end: string
          period_type: string
          ticker: string
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          cost_of_revenue?: number | null
          created_at?: string | null
          earnings_per_share?: number | null
          ebit?: number | null
          ebitda?: number | null
          gross_margin?: number | null
          gross_profit?: number | null
          id?: string
          net_income?: number | null
          net_margin?: number | null
          operating_expenses?: number | null
          operating_income?: number | null
          operating_margin?: number | null
          period_end: string
          period_type: string
          ticker: string
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          cost_of_revenue?: number | null
          created_at?: string | null
          earnings_per_share?: number | null
          ebit?: number | null
          ebitda?: number | null
          gross_margin?: number | null
          gross_profit?: number | null
          id?: string
          net_income?: number | null
          net_margin?: number | null
          operating_expenses?: number | null
          operating_income?: number | null
          operating_margin?: number | null
          period_end?: string
          period_type?: string
          ticker?: string
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      interactions: {
        Row: {
          advisor_id: string
          client_id: string
          created_at: string
          description: string | null
          id: string
          interaction_date: string
          interaction_type: string
          status: string
          subject: string
        }
        Insert: {
          advisor_id: string
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          interaction_date?: string
          interaction_type: string
          status?: string
          subject: string
        }
        Update: {
          advisor_id?: string
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          interaction_date?: string
          interaction_type?: string
          status?: string
          subject?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: []
      }
      irpf_imports: {
        Row: {
          client_id: string | null
          error_message: string | null
          file_name: string | null
          id: string
          imported_at: string | null
          raw_data: Json | null
          status: string | null
          total_assets_imported: number | null
          user_id: string
          year: number
        }
        Insert: {
          client_id?: string | null
          error_message?: string | null
          file_name?: string | null
          id?: string
          imported_at?: string | null
          raw_data?: Json | null
          status?: string | null
          total_assets_imported?: number | null
          user_id: string
          year: number
        }
        Update: {
          client_id?: string | null
          error_message?: string | null
          file_name?: string | null
          id?: string
          imported_at?: string | null
          raw_data?: Json | null
          status?: string | null
          total_assets_imported?: number | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "irpf_imports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          advisor_id: string
          client_id: string | null
          created_at: string | null
          id: string
          meeting_date: string
          notes: string | null
          title: string
        }
        Insert: {
          advisor_id: string
          client_id?: string | null
          created_at?: string | null
          id?: string
          meeting_date: string
          notes?: string | null
          title: string
        }
        Update: {
          advisor_id?: string
          client_id?: string | null
          created_at?: string | null
          id?: string
          meeting_date?: string
          notes?: string | null
          title?: string
        }
        Relationships: []
      }
      net_worth_history: {
        Row: {
          breakdown: Json | null
          client_id: string | null
          created_at: string | null
          id: string
          net_worth: number
          snapshot_date: string
          total_assets: number
          total_investments: number
          total_liabilities: number
          user_id: string
        }
        Insert: {
          breakdown?: Json | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          net_worth?: number
          snapshot_date: string
          total_assets?: number
          total_investments?: number
          total_liabilities?: number
          user_id: string
        }
        Update: {
          breakdown?: Json | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          net_worth?: number
          snapshot_date?: string
          total_assets?: number
          total_investments?: number
          total_liabilities?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "net_worth_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          alert_id: string | null
          created_at: string | null
          current_value: number | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          ticker: string | null
          title: string
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          ticker?: string | null
          title: string
          user_id: string
        }
        Update: {
          alert_id?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          ticker?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          cnpj: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      parental_consents: {
        Row: {
          created_at: string
          guardian_email: string
          guardian_name: string
          id: string
          metadata: Json | null
          minor_user_id: string
          status: string | null
          updated_at: string
          verification_method: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          guardian_email: string
          guardian_name: string
          id?: string
          metadata?: Json | null
          minor_user_id: string
          status?: string | null
          updated_at?: string
          verification_method?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          guardian_email?: string
          guardian_name?: string
          id?: string
          metadata?: Json | null
          minor_user_id?: string
          status?: string | null
          updated_at?: string
          verification_method?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      patrimony_assets: {
        Row: {
          acquisition_date: string | null
          acquisition_value: number
          address: string | null
          brand: string | null
          category: string
          city: string | null
          client_id: string | null
          company_cnpj: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          current_value: number | null
          description: string | null
          documents: Json | null
          fipe_brand_id: string | null
          fipe_code: string | null
          fipe_model_id: string | null
          id: string
          ir_code: string | null
          ir_description: string | null
          ir_year: number | null
          is_active: boolean | null
          last_estimated_value: number | null
          last_valuation_date: string | null
          model: string | null
          name: string
          notes: string | null
          ownership_percentage: number | null
          photos: Json | null
          registration_number: string | null
          serial_number: string | null
          source: string | null
          state: string | null
          subcategory: string | null
          updated_at: string | null
          user_id: string
          valuation_source: string | null
          vehicle_year: number | null
        }
        Insert: {
          acquisition_date?: string | null
          acquisition_value?: number
          address?: string | null
          brand?: string | null
          category: string
          city?: string | null
          client_id?: string | null
          company_cnpj?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          documents?: Json | null
          fipe_brand_id?: string | null
          fipe_code?: string | null
          fipe_model_id?: string | null
          id?: string
          ir_code?: string | null
          ir_description?: string | null
          ir_year?: number | null
          is_active?: boolean | null
          last_estimated_value?: number | null
          last_valuation_date?: string | null
          model?: string | null
          name: string
          notes?: string | null
          ownership_percentage?: number | null
          photos?: Json | null
          registration_number?: string | null
          serial_number?: string | null
          source?: string | null
          state?: string | null
          subcategory?: string | null
          updated_at?: string | null
          user_id: string
          valuation_source?: string | null
          vehicle_year?: number | null
        }
        Update: {
          acquisition_date?: string | null
          acquisition_value?: number
          address?: string | null
          brand?: string | null
          category?: string
          city?: string | null
          client_id?: string | null
          company_cnpj?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          documents?: Json | null
          fipe_brand_id?: string | null
          fipe_code?: string | null
          fipe_model_id?: string | null
          id?: string
          ir_code?: string | null
          ir_description?: string | null
          ir_year?: number | null
          is_active?: boolean | null
          last_estimated_value?: number | null
          last_valuation_date?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          ownership_percentage?: number | null
          photos?: Json | null
          registration_number?: string | null
          serial_number?: string | null
          source?: string | null
          state?: string | null
          subcategory?: string | null
          updated_at?: string | null
          user_id?: string
          valuation_source?: string | null
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patrimony_assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      patrimony_liabilities: {
        Row: {
          category: string
          client_id: string | null
          created_at: string | null
          creditor_name: string | null
          creditor_type: string | null
          current_balance: number
          description: string | null
          end_date: string | null
          id: string
          installment_value: number | null
          interest_rate: number | null
          ir_code: string | null
          ir_year: number | null
          is_active: boolean | null
          linked_asset_id: string | null
          name: string
          notes: string | null
          original_value: number
          paid_installments: number | null
          source: string | null
          start_date: string | null
          total_installments: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          client_id?: string | null
          created_at?: string | null
          creditor_name?: string | null
          creditor_type?: string | null
          current_balance: number
          description?: string | null
          end_date?: string | null
          id?: string
          installment_value?: number | null
          interest_rate?: number | null
          ir_code?: string | null
          ir_year?: number | null
          is_active?: boolean | null
          linked_asset_id?: string | null
          name: string
          notes?: string | null
          original_value: number
          paid_installments?: number | null
          source?: string | null
          start_date?: string | null
          total_installments?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          client_id?: string | null
          created_at?: string | null
          creditor_name?: string | null
          creditor_type?: string | null
          current_balance?: number
          description?: string | null
          end_date?: string | null
          id?: string
          installment_value?: number | null
          interest_rate?: number | null
          ir_code?: string | null
          ir_year?: number | null
          is_active?: boolean | null
          linked_asset_id?: string | null
          name?: string
          notes?: string | null
          original_value?: number
          paid_installments?: number | null
          source?: string | null
          start_date?: string | null
          total_installments?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patrimony_liabilities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrimony_liabilities_linked_asset_id_fkey"
            columns: ["linked_asset_id"]
            isOneToOne: false
            referencedRelation: "patrimony_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      patrimony_value_history: {
        Row: {
          created_at: string | null
          id: string
          patrimony_asset_id: string
          source: string | null
          value: number
          value_date: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          patrimony_asset_id: string
          source?: string | null
          value: number
          value_date?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          patrimony_asset_id?: string
          source?: string | null
          value?: number
          value_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "patrimony_value_history_patrimony_asset_id_fkey"
            columns: ["patrimony_asset_id"]
            isOneToOne: false
            referencedRelation: "patrimony_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      pluggy_accounts: {
        Row: {
          account_id: string
          account_name: string
          account_number: string | null
          account_type: string
          available_balance: number | null
          balance: number | null
          category_id: string | null
          created_at: string | null
          credit_limit: number | null
          currency: string | null
          id: string
          overdraft_limit: number | null
          owner_name: string | null
          pluggy_item_id: string
          tax_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          account_name: string
          account_number?: string | null
          account_type: string
          available_balance?: number | null
          balance?: number | null
          category_id?: string | null
          created_at?: string | null
          credit_limit?: number | null
          currency?: string | null
          id?: string
          overdraft_limit?: number | null
          owner_name?: string | null
          pluggy_item_id: string
          tax_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          account_name?: string
          account_number?: string | null
          account_type?: string
          available_balance?: number | null
          balance?: number | null
          category_id?: string | null
          created_at?: string | null
          credit_limit?: number | null
          currency?: string | null
          id?: string
          overdraft_limit?: number | null
          owner_name?: string | null
          pluggy_item_id?: string
          tax_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pluggy_accounts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pluggy_accounts_pluggy_item_id_fkey"
            columns: ["pluggy_item_id"]
            isOneToOne: false
            referencedRelation: "pluggy_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pluggy_audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          item_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          item_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          item_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pluggy_credit_cards: {
        Row: {
          available_credit: number | null
          card_id: string
          card_name: string
          card_network: string | null
          close_day: number | null
          created_at: string | null
          due_day: number | null
          id: string
          minimum_payment: number | null
          pluggy_account_id: string
          total_balance: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          available_credit?: number | null
          card_id: string
          card_name: string
          card_network?: string | null
          close_day?: number | null
          created_at?: string | null
          due_day?: number | null
          id?: string
          minimum_payment?: number | null
          pluggy_account_id: string
          total_balance?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          available_credit?: number | null
          card_id?: string
          card_name?: string
          card_network?: string | null
          close_day?: number | null
          created_at?: string | null
          due_day?: number | null
          id?: string
          minimum_payment?: number | null
          pluggy_account_id?: string
          total_balance?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pluggy_credit_cards_pluggy_account_id_fkey"
            columns: ["pluggy_account_id"]
            isOneToOne: false
            referencedRelation: "pluggy_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      pluggy_investment_portfolios: {
        Row: {
          created_at: string | null
          id: string
          pluggy_account_id: string
          portfolio_type: string
          total_gain: number | null
          total_gain_percent: number | null
          total_value: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pluggy_account_id: string
          portfolio_type: string
          total_gain?: number | null
          total_gain_percent?: number | null
          total_value: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pluggy_account_id?: string
          portfolio_type?: string
          total_gain?: number | null
          total_gain_percent?: number | null
          total_value?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pluggy_investment_portfolios_pluggy_account_id_fkey"
            columns: ["pluggy_account_id"]
            isOneToOne: false
            referencedRelation: "pluggy_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      pluggy_investments: {
        Row: {
          amount: number
          created_at: string | null
          current_price: number | null
          id: string
          investment_id: string
          investment_name: string
          investment_type: string
          pluggy_account_id: string
          quantity: number | null
          ticker: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          current_price?: number | null
          id?: string
          investment_id: string
          investment_name: string
          investment_type: string
          pluggy_account_id: string
          quantity?: number | null
          ticker?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          current_price?: number | null
          id?: string
          investment_id?: string
          investment_name?: string
          investment_type?: string
          pluggy_account_id?: string
          quantity?: number | null
          ticker?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pluggy_investments_pluggy_account_id_fkey"
            columns: ["pluggy_account_id"]
            isOneToOne: false
            referencedRelation: "pluggy_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      pluggy_items: {
        Row: {
          connector_id: string
          connector_name: string
          created_at: string | null
          error: string | null
          id: string
          item_id: string
          last_sync_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          connector_id: string
          connector_name: string
          created_at?: string | null
          error?: string | null
          id?: string
          item_id: string
          last_sync_at?: string | null
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          connector_id?: string
          connector_name?: string
          created_at?: string | null
          error?: string | null
          id?: string
          item_id?: string
          last_sync_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pluggy_rate_limits: {
        Row: {
          action: string
          attempt_count: number
          id: string
          last_attempt: string
          user_id: string
          window_start: string
        }
        Insert: {
          action: string
          attempt_count?: number
          id?: string
          last_attempt?: string
          user_id: string
          window_start?: string
        }
        Update: {
          action?: string
          attempt_count?: number
          id?: string
          last_attempt?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      pluggy_sync_history: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          pluggy_item_id: string
          status: string
          sync_type: string
          synced_records: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          pluggy_item_id: string
          status: string
          sync_type: string
          synced_records?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          pluggy_item_id?: string
          status?: string
          sync_type?: string
          synced_records?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pluggy_sync_history_pluggy_item_id_fkey"
            columns: ["pluggy_item_id"]
            isOneToOne: false
            referencedRelation: "pluggy_items"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_documents: {
        Row: {
          created_at: string
          current_version_id: string | null
          id: string
          type: Database["public"]["Enums"]["policy_document_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_version_id?: string | null
          id?: string
          type: Database["public"]["Enums"]["policy_document_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_version_id?: string | null
          id?: string
          type?: Database["public"]["Enums"]["policy_document_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_current_version"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_versions: {
        Row: {
          content: string
          created_at: string
          document_id: string
          id: string
          is_active: boolean
          published_at: string
          version: string
        }
        Insert: {
          content: string
          created_at?: string
          document_id: string
          id?: string
          is_active?: boolean
          published_at?: string
          version: string
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          is_active?: boolean
          published_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "policy_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_cash_flows: {
        Row: {
          amount: number
          asset_id: string | null
          created_at: string | null
          description: string | null
          flow_date: string
          flow_type: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          asset_id?: string | null
          created_at?: string | null
          description?: string | null
          flow_date: string
          flow_type: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          asset_id?: string | null
          created_at?: string | null
          description?: string | null
          flow_date?: string
          flow_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_cash_flows_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_snapshots: {
        Row: {
          assets_breakdown: Json | null
          created_at: string | null
          cumulative_return_percent: number | null
          daily_return_percent: number | null
          id: string
          snapshot_date: string
          total_invested: number
          total_value: number
          user_id: string
        }
        Insert: {
          assets_breakdown?: Json | null
          created_at?: string | null
          cumulative_return_percent?: number | null
          daily_return_percent?: number | null
          id?: string
          snapshot_date?: string
          total_invested?: number
          total_value?: number
          user_id: string
        }
        Update: {
          assets_breakdown?: Json | null
          created_at?: string | null
          cumulative_return_percent?: number | null
          daily_return_percent?: number | null
          id?: string
          snapshot_date?: string
          total_invested?: number
          total_value?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_range: Database["public"]["Enums"]["age_range"] | null
          birth_date: string | null
          cpf: string | null
          cpf_encrypted: string | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          full_name: string | null
          id: string
          is_active: boolean
          is_minor: boolean | null
          notification_preferences: Json | null
          onboarding_completed: boolean | null
          organization_id: string | null
          phone: string | null
          phone_encrypted: string | null
          profile_completed: boolean | null
          tour_completed: boolean
          updated_at: string | null
          welcome_email_sent: boolean
          whatsapp_notifications_enabled: boolean | null
        }
        Insert: {
          age_range?: Database["public"]["Enums"]["age_range"] | null
          birth_date?: string | null
          cpf?: string | null
          cpf_encrypted?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          full_name?: string | null
          id: string
          is_active?: boolean
          is_minor?: boolean | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          organization_id?: string | null
          phone?: string | null
          phone_encrypted?: string | null
          profile_completed?: boolean | null
          tour_completed?: boolean
          updated_at?: string | null
          welcome_email_sent?: boolean
          whatsapp_notifications_enabled?: boolean | null
        }
        Update: {
          age_range?: Database["public"]["Enums"]["age_range"] | null
          birth_date?: string | null
          cpf?: string | null
          cpf_encrypted?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_minor?: boolean | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          organization_id?: string | null
          phone?: string | null
          phone_encrypted?: string | null
          profile_completed?: boolean | null
          tour_completed?: boolean
          updated_at?: string | null
          welcome_email_sent?: boolean
          whatsapp_notifications_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_fundamentals: {
        Row: {
          asset_class: string
          cash_and_equivalents: number | null
          created_at: string | null
          data_source: string | null
          dividends_paid: number | null
          ebit: number | null
          ebit_margin: number | null
          ebitda: number | null
          ebitda_margin: number | null
          ev_ebitda: number | null
          format_flags: Json | null
          gross_margin: number | null
          gross_profit: number | null
          id: string
          is_financial: boolean | null
          net_debt: number | null
          net_income: number | null
          net_margin: number | null
          p_l: number | null
          p_vp: number | null
          quarter: number
          revenue: number | null
          roa: number | null
          roe: number | null
          roic: number | null
          ticker: string
          total_assets: number | null
          total_debt: number | null
          total_equity: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          asset_class?: string
          cash_and_equivalents?: number | null
          created_at?: string | null
          data_source?: string | null
          dividends_paid?: number | null
          ebit?: number | null
          ebit_margin?: number | null
          ebitda?: number | null
          ebitda_margin?: number | null
          ev_ebitda?: number | null
          format_flags?: Json | null
          gross_margin?: number | null
          gross_profit?: number | null
          id?: string
          is_financial?: boolean | null
          net_debt?: number | null
          net_income?: number | null
          net_margin?: number | null
          p_l?: number | null
          p_vp?: number | null
          quarter: number
          revenue?: number | null
          roa?: number | null
          roe?: number | null
          roic?: number | null
          ticker: string
          total_assets?: number | null
          total_debt?: number | null
          total_equity?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          asset_class?: string
          cash_and_equivalents?: number | null
          created_at?: string | null
          data_source?: string | null
          dividends_paid?: number | null
          ebit?: number | null
          ebit_margin?: number | null
          ebitda?: number | null
          ebitda_margin?: number | null
          ev_ebitda?: number | null
          format_flags?: Json | null
          gross_margin?: number | null
          gross_profit?: number | null
          id?: string
          is_financial?: boolean | null
          net_debt?: number | null
          net_income?: number | null
          net_margin?: number | null
          p_l?: number | null
          p_vp?: number | null
          quarter?: number
          revenue?: number | null
          roa?: number | null
          roe?: number | null
          roic?: number | null
          ticker?: string
          total_assets?: number | null
          total_debt?: number | null
          total_equity?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          explanation: string | null
          id: string
          options: Json
          order_index: number
          question: string
          question_type: string
          quiz_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          options: Json
          order_index: number
          question: string
          question_type: string
          quiz_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          options?: Json
          order_index?: number
          question?: string
          question_type?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "educational_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_metrics: {
        Row: {
          asset_turnover: number | null
          created_at: string | null
          current_ratio: number | null
          debt_to_assets: number | null
          debt_to_equity: number | null
          dividend_yield: number | null
          earnings_growth_yoy: number | null
          enterprise_value: number | null
          ev_to_ebitda: number | null
          gross_margin: number | null
          id: string
          interest_coverage: number | null
          inventory_turnover: number | null
          last_updated: string | null
          market_cap: number | null
          net_margin: number | null
          operating_margin: number | null
          payout_ratio: number | null
          price_to_book: number | null
          price_to_earnings: number | null
          price_to_sales: number | null
          quick_ratio: number | null
          revenue_growth_yoy: number | null
          roa: number | null
          roe: number | null
          roic: number | null
          ticker: string
        }
        Insert: {
          asset_turnover?: number | null
          created_at?: string | null
          current_ratio?: number | null
          debt_to_assets?: number | null
          debt_to_equity?: number | null
          dividend_yield?: number | null
          earnings_growth_yoy?: number | null
          enterprise_value?: number | null
          ev_to_ebitda?: number | null
          gross_margin?: number | null
          id?: string
          interest_coverage?: number | null
          inventory_turnover?: number | null
          last_updated?: string | null
          market_cap?: number | null
          net_margin?: number | null
          operating_margin?: number | null
          payout_ratio?: number | null
          price_to_book?: number | null
          price_to_earnings?: number | null
          price_to_sales?: number | null
          quick_ratio?: number | null
          revenue_growth_yoy?: number | null
          roa?: number | null
          roe?: number | null
          roic?: number | null
          ticker: string
        }
        Update: {
          asset_turnover?: number | null
          created_at?: string | null
          current_ratio?: number | null
          debt_to_assets?: number | null
          debt_to_equity?: number | null
          dividend_yield?: number | null
          earnings_growth_yoy?: number | null
          enterprise_value?: number | null
          ev_to_ebitda?: number | null
          gross_margin?: number | null
          id?: string
          interest_coverage?: number | null
          inventory_turnover?: number | null
          last_updated?: string | null
          market_cap?: number | null
          net_margin?: number | null
          operating_margin?: number | null
          payout_ratio?: number | null
          price_to_book?: number | null
          price_to_earnings?: number | null
          price_to_sales?: number | null
          quick_ratio?: number | null
          revenue_growth_yoy?: number | null
          roa?: number | null
          roe?: number | null
          roic?: number | null
          ticker?: string
        }
        Relationships: []
      }
      stock_price_history: {
        Row: {
          close_price: number | null
          created_at: string | null
          date: string
          high_price: number | null
          id: string
          low_price: number | null
          open_price: number | null
          ticker: string
          updated_at: string | null
          volume: number | null
        }
        Insert: {
          close_price?: number | null
          created_at?: string | null
          date: string
          high_price?: number | null
          id?: string
          low_price?: number | null
          open_price?: number | null
          ticker: string
          updated_at?: string | null
          volume?: number | null
        }
        Update: {
          close_price?: number | null
          created_at?: string | null
          date?: string
          high_price?: number | null
          id?: string
          low_price?: number | null
          open_price?: number | null
          ticker?: string
          updated_at?: string | null
          volume?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_email: string | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          max_users: number | null
          organization_id: string | null
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_email?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          max_users?: number | null
          organization_id?: string | null
          plan_type?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_email?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          max_users?: number | null
          organization_id?: string | null
          plan_type?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_execution_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          details: Json | null
          error_message: string | null
          function_name: string
          id: string
          records_processed: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          function_name: string
          id?: string
          records_processed?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          function_name?: string
          id?: string
          records_processed?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      target_allocations: {
        Row: {
          created_at: string | null
          id: string
          sub_class: string
          target_percentage: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          sub_class: string
          target_percentage: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          sub_class?: string
          target_percentage?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          advisor_id: string
          client_id: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      technical_indicators: {
        Row: {
          created_at: string | null
          date: string
          id: string
          indicator_type: string
          metadata: Json | null
          period: number | null
          ticker: string
          updated_at: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          indicator_type: string
          metadata?: Json | null
          period?: number | null
          ticker: string
          updated_at?: string | null
          value: number
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          indicator_type?: string
          metadata?: Json | null
          period?: number | null
          ticker?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: []
      }
      temporary_passwords: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          temp_password: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          temp_password: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          temp_password?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          is_recurring: boolean | null
          recurrence_frequency: string | null
          title: string
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          recurrence_frequency?: string | null
          title: string
          transaction_date?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          recurrence_frequency?: string | null
          title?: string
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      upcoming_dividends: {
        Row: {
          client_id: string | null
          created_at: string | null
          dividend_type: string
          ex_date: string | null
          expected_amount: number | null
          id: string
          is_notified: boolean | null
          payment_date: string
          quantity: number | null
          rate: number
          source: string | null
          ticker: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          dividend_type: string
          ex_date?: string | null
          expected_amount?: number | null
          id?: string
          is_notified?: boolean | null
          payment_date: string
          quantity?: number | null
          rate: number
          source?: string | null
          ticker: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          dividend_type?: string
          ex_date?: string | null
          expected_amount?: number | null
          id?: string
          is_notified?: boolean | null
          payment_date?: string
          quantity?: number | null
          rate?: number
          source?: string | null
          ticker?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_type: string
          created_at: string | null
          earned_at: string | null
          goal_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          achievement_type: string
          created_at?: string | null
          earned_at?: string | null
          goal_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          achievement_type?: string
          created_at?: string | null
          earned_at?: string | null
          goal_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "financial_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          consent_status: Database["public"]["Enums"]["consent_status"]
          consented_at: string
          created_at: string
          document_type: Database["public"]["Enums"]["policy_document_type"]
          document_version_id: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          revoked_at: string | null
          source: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_status?: Database["public"]["Enums"]["consent_status"]
          consented_at?: string
          created_at?: string
          document_type: Database["public"]["Enums"]["policy_document_type"]
          document_version_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          revoked_at?: string | null
          source?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_status?: Database["public"]["Enums"]["consent_status"]
          consented_at?: string
          created_at?: string
          document_type?: Database["public"]["Enums"]["policy_document_type"]
          document_version_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          revoked_at?: string | null
          source?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_consents_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_education_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          notes: string | null
          progress_percentage: number | null
          quiz_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          notes?: string | null
          progress_percentage?: number | null
          quiz_score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          progress_percentage?: number | null
          quiz_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_event_notifications: {
        Row: {
          event_id: string | null
          id: string
          notified_at: string | null
          user_id: string
          whatsapp_sent: boolean | null
        }
        Insert: {
          event_id?: string | null
          id?: string
          notified_at?: string | null
          user_id: string
          whatsapp_sent?: boolean | null
        }
        Update: {
          event_id?: string | null
          id?: string
          notified_at?: string | null
          user_id?: string
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_event_notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "corporate_events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stock_notes: {
        Row: {
          asset_class: string
          id: string
          note: string | null
          status: string | null
          tags: string[] | null
          ticker: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asset_class?: string
          id?: string
          note?: string | null
          status?: string | null
          tags?: string[] | null
          ticker: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asset_class?: string
          id?: string
          note?: string | null
          status?: string | null
          tags?: string[] | null
          ticker?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_watchlists: {
        Row: {
          asset_class: string
          created_at: string | null
          id: string
          ticker: string
          user_id: string
        }
        Insert: {
          asset_class?: string
          created_at?: string | null
          id?: string
          ticker: string
          user_id: string
        }
        Update: {
          asset_class?: string
          created_at?: string | null
          id?: string
          ticker?: string
          user_id?: string
        }
        Relationships: []
      }
      valuation_scenarios: {
        Row: {
          asset_class: string
          created_at: string | null
          id: string
          inputs: Json
          results: Json | null
          scenario_name: string
          ticker: string
          updated_at: string | null
          user_id: string
          valuation_method: string
        }
        Insert: {
          asset_class?: string
          created_at?: string | null
          id?: string
          inputs: Json
          results?: Json | null
          scenario_name: string
          ticker: string
          updated_at?: string | null
          user_id: string
          valuation_method: string
        }
        Update: {
          asset_class?: string
          created_at?: string | null
          id?: string
          inputs?: Json
          results?: Json | null
          scenario_name?: string
          ticker?: string
          updated_at?: string | null
          user_id?: string
          valuation_method?: string
        }
        Relationships: []
      }
    }
    Views: {
      advisor_performance_metrics: {
        Row: {
          active_deals: number | null
          advisor_email: string | null
          advisor_id: string | null
          advisor_name: string | null
          interactions_last_30_days: number | null
          meetings_last_30_days: number | null
          new_clients_last_30_days: number | null
          total_aum: number | null
          total_clients: number | null
          total_deals: number | null
          total_interactions: number | null
          total_meetings: number | null
        }
        Relationships: []
      }
      profiles_secure: {
        Row: {
          birth_date: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          notification_preferences: Json | null
          onboarding_completed: boolean | null
          organization_id: string | null
          phone: string | null
          profile_completed: boolean | null
          tour_completed: boolean | null
          updated_at: string | null
          welcome_email_sent: boolean | null
          whatsapp_notifications_enabled: boolean | null
        }
        Insert: {
          birth_date?: string | null
          cpf?: never
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          organization_id?: string | null
          phone?: never
          profile_completed?: boolean | null
          tour_completed?: boolean | null
          updated_at?: string | null
          welcome_email_sent?: boolean | null
          whatsapp_notifications_enabled?: boolean | null
        }
        Update: {
          birth_date?: string | null
          cpf?: never
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          organization_id?: string | null
          phone?: never
          profile_completed?: boolean | null
          tour_completed?: boolean | null
          updated_at?: string | null
          welcome_email_sent?: boolean | null
          whatsapp_notifications_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_advisor_invitation: {
        Args: { p_invitation_id: string }
        Returns: Json
      }
      accept_invitation: { Args: { p_token: string }; Returns: Json }
      admin_create_user: {
        Args: {
          user_email: string
          user_full_name: string
          user_password: string
          user_role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: Json
      }
      can_organization_add_user: {
        Args: { _organization_id: string }
        Returns: boolean
      }
      check_pluggy_rate_limit: {
        Args: {
          _action: string
          _max_attempts?: number
          _user_id: string
          _window_minutes?: number
        }
        Returns: boolean
      }
      count_business_days: {
        Args: { end_date: string; start_date: string }
        Returns: number
      }
      count_organization_users: {
        Args: { _organization_id: string }
        Returns: number
      }
      decrypt_pii: {
        Args: { _encrypted_data: string; _user_id: string }
        Returns: string
      }
      decrypt_sensitive_data: {
        Args: { _encrypted_data: string }
        Returns: string
      }
      encrypt_pii: {
        Args: { _data: string; _user_id: string }
        Returns: string
      }
      encrypt_sensitive_data: { Args: { _data: string }; Returns: string }
      generate_temp_password: { Args: never; Returns: string }
      get_business_days: {
        Args: { end_date: string; start_date: string }
        Returns: {
          business_date: string
        }[]
      }
      get_organization_subscription: {
        Args: { _organization_id: string }
        Returns: {
          current_period_end: string
          max_users: number
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          status: string
        }[]
      }
      get_user_organization: { Args: { _user_id: string }; Returns: string }
      get_user_plan: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["subscription_plan"]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_password: { Args: { password: string }; Returns: string }
      is_service_role: { Args: never; Returns: boolean }
      log_audit: {
        Args: {
          p_action: string
          p_details?: Json
          p_ip_address?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: undefined
      }
      log_pluggy_audit: {
        Args: {
          _action: string
          _details?: Json
          _ip_address?: string
          _item_id?: string
          _user_agent?: string
          _user_id: string
        }
        Returns: string
      }
      mask_cpf: { Args: { _cpf: string }; Returns: string }
      mask_phone: { Args: { _phone: string }; Returns: string }
      reject_advisor_invitation: {
        Args: { p_invitation_id: string }
        Returns: Json
      }
      user_in_organization: {
        Args: { _organization_id: string; _user_id: string }
        Returns: boolean
      }
      validate_invitation_token: { Args: { p_token: string }; Returns: Json }
      verify_password: {
        Args: { hashed_password: string; password: string }
        Returns: boolean
      }
    }
    Enums: {
      age_range: "under_13" | "13_15" | "16_17" | "18_plus"
      app_role: "admin" | "assessor" | "cliente" | "gestor"
      consent_status: "accepted" | "rejected" | "revoked"
      policy_document_type: "terms" | "privacy" | "cookies" | "marketing"
      subscription_plan: "trial" | "investor" | "pro" | "professional"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "expired"
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
      age_range: ["under_13", "13_15", "16_17", "18_plus"],
      app_role: ["admin", "assessor", "cliente", "gestor"],
      consent_status: ["accepted", "rejected", "revoked"],
      policy_document_type: ["terms", "privacy", "cookies", "marketing"],
      subscription_plan: ["trial", "investor", "pro", "professional"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "expired",
      ],
    },
  },
} as const
