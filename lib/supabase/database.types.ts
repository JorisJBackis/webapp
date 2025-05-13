// Merged file combining original and additions

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      // Existing tables here (already defined in original)
      // New/extended tables go here
      league_position_metric_averages: {
        Row: {
          average_value: number | null
          last_calculated: string | null
          league_name: string
          metric_name: string
          position: string
        }
        Insert: {
          average_value?: number | null
          last_calculated?: string | null
          league_name: string
          metric_name: string
          position: string
        }
        Update: {
          average_value?: number | null
          last_calculated?: string | null
          league_name?: string
          metric_name?: string
          position?: string
        }
        Relationships: []
      }
      recruitment_needs: {
        Row: {
          budget_loan_fee_max: number | null
          budget_transfer_max: number | null
          created_at: string
          created_by_club_id: number
          max_age: number | null
          max_height: number | null
          min_age: number | null
          min_height: number | null
          need_id: number
          notes: string | null
          position_needed: string
          preferred_foot: string | null
          salary_range: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget_loan_fee_max?: number | null
          budget_transfer_max?: number | null
          created_at?: string
          created_by_club_id: number
          max_age?: number | null
          max_height?: number | null
          min_age?: number | null
          min_height?: number | null
          need_id?: number
          notes?: string | null
          position_needed: string
          preferred_foot?: string | null
          salary_range?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget_loan_fee_max?: number | null
          budget_transfer_max?: number | null
          created_at?: string
          created_by_club_id?: number
          max_age?: number | null
          max_height?: number | null
          min_age?: number | null
          min_height?: number | null
          need_id?: number
          notes?: string | null
          position_needed?: string
          preferred_foot?: string | null
          salary_range?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_needs_created_by_club_id_fkey"
            columns: ["created_by_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // Extended functions
      get_metric_averages_for_position_league: {
        Args: { p_position_name: string; p_league_name: string }
        Returns: {
          average_value: number | null
          last_calculated: string | null
          league_name: string
          metric_name: string
          position: string
        }[]
      }
      get_my_recruitment_needs: {
        Args: { p_requesting_club_id: number }
        Returns: {
          need_id: number
          created_by_club_id: number
          position_needed: string
          min_age: number
          max_age: number
          min_height: number
          max_height: number
          preferred_foot: string
          status: string
          budget_transfer_max: number
          budget_loan_fee_max: number
          salary_range: string
          notes: string
          need_created_at: string
        }[]
      }
      get_recruitment_needs: {
        Args: { p_requesting_club_id: number }
        Returns: {
          need_id: number
          created_by_club_id: number
          position_needed: string
          min_age: number
          max_age: number
          min_height: number
          max_height: number
          preferred_foot: string
          budget_transfer_max: number
          budget_loan_fee_max: number
          salary_range: string
          notes: string
          need_created_at: string
          posting_club_name: string
        }[]
      }
      update_league_position_averages: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      listing_status_enum: "active" | "inactive" | "completed"
      listing_type_enum: "loan" | "transfer"
      loan_visibility_enum: "clubs" | "agents" | "both"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Utility types remain the same as in your original file...
// Constants updated to reflect merged enums

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      listing_status_enum: ["active", "inactive", "completed"],
      listing_type_enum: ["loan", "transfer"],
      loan_visibility_enum: ["clubs", "agents", "both"],
    },
  },
} as const
