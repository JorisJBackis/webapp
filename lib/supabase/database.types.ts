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
      clubs: {
        Row: {
          created_at: string
          id: number
          league: string | null
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          league?: string | null
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          league?: string | null
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      final_position_averages: {
        Row: {
          position: number | null
          stats: Json | null
        }
        Insert: {
          position?: number | null
          stats?: Json | null
        }
        Update: {
          position?: number | null
          stats?: Json | null
        }
        Relationships: []
      }
      player_listings: {
        Row: {
          asking_price: number | null
          created_at: string
          listed_by_club_id: number
          listing_id: number
          listing_notes: string | null
          listing_type: Database["public"]["Enums"]["listing_type_enum"]
          loan_duration: string | null
          loan_fee: number | null
          status: Database["public"]["Enums"]["listing_status_enum"]
          updated_at: string
          wyscout_player_id: number
        }
        Insert: {
          asking_price?: number | null
          created_at?: string
          listed_by_club_id: number
          listing_id?: number
          listing_notes?: string | null
          listing_type: Database["public"]["Enums"]["listing_type_enum"]
          loan_duration?: string | null
          loan_fee?: number | null
          status?: Database["public"]["Enums"]["listing_status_enum"]
          updated_at?: string
          wyscout_player_id: number
        }
        Update: {
          asking_price?: number | null
          created_at?: string
          listed_by_club_id?: number
          listing_id?: number
          listing_notes?: string | null
          listing_type?: Database["public"]["Enums"]["listing_type_enum"]
          loan_duration?: string | null
          loan_fee?: number | null
          status?: Database["public"]["Enums"]["listing_status_enum"]
          updated_at?: string
          wyscout_player_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_listings_listed_by_club_id_fkey"
            columns: ["listed_by_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          club_id: number | null
          created_at: string
          id: number
          loan_visibility:
            | Database["public"]["Enums"]["loan_visibility_enum"]
            | null
          name: string
          on_loan: boolean | null
          position: string
          stats: Json
          updated_at: string
          wyscout_player_id: number | null
        }
        Insert: {
          club_id?: number | null
          created_at?: string
          id?: number
          loan_visibility?:
            | Database["public"]["Enums"]["loan_visibility_enum"]
            | null
          name: string
          on_loan?: boolean | null
          position: string
          stats?: Json
          updated_at?: string
          wyscout_player_id?: number | null
        }
        Update: {
          club_id?: number | null
          created_at?: string
          id?: number
          loan_visibility?:
            | Database["public"]["Enums"]["loan_visibility_enum"]
            | null
          name?: string
          on_loan?: boolean | null
          position?: string
          stats?: Json
          updated_at?: string
          wyscout_player_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          club_id: number | null
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          club_id?: number | null
          created_at?: string
          id: string
          updated_at?: string
        }
        Update: {
          club_id?: number | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_suggestions: {
        Row: {
          club_id: number | null
          created_at: string
          id: number
          player_id: number | null
          player_name: string
          user_email: string
        }
        Insert: {
          club_id?: number | null
          created_at?: string
          id?: number
          player_id?: number | null
          player_name: string
          user_email: string
        }
        Update: {
          club_id?: number | null
          created_at?: string
          id?: number
          player_id?: number | null
          player_name?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_suggestions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_suggestions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      team_match_stats: {
        Row: {
          competition: string | null
          date: string | null
          match_id: string | null
          stats: Json | null
          team_id: number | null
        }
        Insert: {
          competition?: string | null
          date?: string | null
          match_id?: string | null
          stats?: Json | null
          team_id?: number | null
        }
        Update: {
          competition?: string | null
          date?: string | null
          match_id?: string | null
          stats?: Json | null
          team_id?: number | null
        }
        Relationships: []
      }
      team_metrics_aggregated: {
        Row: {
          "Accurate Back Passes": number | null
          "Accurate Crosses": number | null
          "Accurate Forward Passes": number | null
          "Accurate Lateral Passes": number | null
          "Accurate Long Passes": number | null
          "Accurate Passes": number | null
          "Accurate Passes to Final Third": number | null
          "Accurate Progressive Passes": number | null
          "Accurate Smart Passes": number | null
          "Accurate Throw Ins": number | null
          "Aerial Duels": number | null
          "Aerial Duels Success %": number | null
          "Aerial Duels Won": number | null
          "Average Pass Length": number | null
          "Average Passes per Possession": number | null
          "Average Shot Distance": number | null
          "Back Pass Accuracy": number | null
          "Back Passes": number | null
          Clearances: number | null
          "Conceded Goals": number | null
          "Corner Success %": number | null
          Corners: number | null
          "Corners with Shots": number | null
          "Counterattack Success %": number | null
          Counterattacks: number | null
          "Counterattacks with Shots": number | null
          "Cross Accuracy": number | null
          "Deep Completed Crosses": number | null
          "Deep Completed Passes": number | null
          "Defensive Duels": number | null
          "Defensive Duels Success %": number | null
          "Defensive Duels Won": number | null
          "Duels Success %": number | null
          "Duels Won": number | null
          "Forward Pass Accuracy": number | null
          "Forward Passes": number | null
          Fouls: number | null
          "Free Kick Success %": number | null
          "Free Kicks": number | null
          "Free Kicks with Shots": number | null
          "Goal Kicks": number | null
          Goals: number | null
          "Goals Conceded 0-15": number | null
          "Goals Conceded 16-30": number | null
          "Goals Conceded 31-45": number | null
          "Goals Conceded 46-60": number | null
          "Goals Conceded 61-75": number | null
          "Goals Conceded 76-90": number | null
          "Goals Scored 0-15": number | null
          "Goals Scored 16-30": number | null
          "Goals Scored 31-45": number | null
          "Goals Scored 46-60": number | null
          "Goals Scored 61-75": number | null
          "Goals Scored 76-90": number | null
          "High Losses": number | null
          "High Recoveries": number | null
          Interceptions: number | null
          "Lateral Pass Accuracy": number | null
          "Lateral Passes": number | null
          "Long Pass %": number | null
          "Long Pass Accuracy": number | null
          "Long Passes": number | null
          "Low Losses": number | null
          "Low Recoveries": number | null
          "Match Tempo": number | null
          "Medium Losses": number | null
          "Medium Recoveries": number | null
          "Offensive Duels": number | null
          "Offensive Duels Success %": number | null
          "Offensive Duels Won": number | null
          Offsides: number | null
          "Pass Accuracy": number | null
          "Pass to Final Third Accuracy": number | null
          "Passes to Final Third": number | null
          Penalties: number | null
          "Penalties Converted": number | null
          "Penalty Area Entries (Crosses)": number | null
          "Penalty Area Entries (Passes)": number | null
          "Penalty Area Entries (Runs)": number | null
          "Penalty Success %": number | null
          "Points Earned": number | null
          "Positional Attacks": number | null
          "Positional Attacks Success %": number | null
          "Positional Attacks with Shots": number | null
          "Possession %": number | null
          PPDA: number | null
          "Progressive Pass Accuracy": number | null
          "Progressive Passes": number | null
          "Red Cards": number | null
          "Set Piece Success %": number | null
          "Set Pieces": number | null
          "Set Pieces with Shots": number | null
          "Shot Accuracy": number | null
          "Shots Against": number | null
          "Shots Against Accuracy": number | null
          "Shots Against on Target": number | null
          "Shots on Target": number | null
          "Shots Outside Box": number | null
          "Shots Outside Box Accuracy": number | null
          "Shots Outside Box on Target": number | null
          "Sliding Tackle Success %": number | null
          "Sliding Tackles": number | null
          "Smart Pass Accuracy": number | null
          "Smart Passes": number | null
          "Successful Sliding Tackles": number | null
          Team: string | null
          team_id: number | null
          "Throw In Accuracy": number | null
          "Throw Ins": number | null
          "Total Crosses": number | null
          "Total Duels": number | null
          "Total Losses": number | null
          "Total Passes": number | null
          "Total Penalty Area Entries": number | null
          "Total Recoveries": number | null
          "Total Shots": number | null
          "Touches in Penalty Area": number | null
          xG: number | null
          "Yellow Cards": number | null
        }
        Insert: {
          "Accurate Back Passes"?: number | null
          "Accurate Crosses"?: number | null
          "Accurate Forward Passes"?: number | null
          "Accurate Lateral Passes"?: number | null
          "Accurate Long Passes"?: number | null
          "Accurate Passes"?: number | null
          "Accurate Passes to Final Third"?: number | null
          "Accurate Progressive Passes"?: number | null
          "Accurate Smart Passes"?: number | null
          "Accurate Throw Ins"?: number | null
          "Aerial Duels"?: number | null
          "Aerial Duels Success %"?: number | null
          "Aerial Duels Won"?: number | null
          "Average Pass Length"?: number | null
          "Average Passes per Possession"?: number | null
          "Average Shot Distance"?: number | null
          "Back Pass Accuracy"?: number | null
          "Back Passes"?: number | null
          Clearances?: number | null
          "Conceded Goals"?: number | null
          "Corner Success %"?: number | null
          Corners?: number | null
          "Corners with Shots"?: number | null
          "Counterattack Success %"?: number | null
          Counterattacks?: number | null
          "Counterattacks with Shots"?: number | null
          "Cross Accuracy"?: number | null
          "Deep Completed Crosses"?: number | null
          "Deep Completed Passes"?: number | null
          "Defensive Duels"?: number | null
          "Defensive Duels Success %"?: number | null
          "Defensive Duels Won"?: number | null
          "Duels Success %"?: number | null
          "Duels Won"?: number | null
          "Forward Pass Accuracy"?: number | null
          "Forward Passes"?: number | null
          Fouls?: number | null
          "Free Kick Success %"?: number | null
          "Free Kicks"?: number | null
          "Free Kicks with Shots"?: number | null
          "Goal Kicks"?: number | null
          Goals?: number | null
          "Goals Conceded 0-15"?: number | null
          "Goals Conceded 16-30"?: number | null
          "Goals Conceded 31-45"?: number | null
          "Goals Conceded 46-60"?: number | null
          "Goals Conceded 61-75"?: number | null
          "Goals Conceded 76-90"?: number | null
          "Goals Scored 0-15"?: number | null
          "Goals Scored 16-30"?: number | null
          "Goals Scored 31-45"?: number | null
          "Goals Scored 46-60"?: number | null
          "Goals Scored 61-75"?: number | null
          "Goals Scored 76-90"?: number | null
          "High Losses"?: number | null
          "High Recoveries"?: number | null
          Interceptions?: number | null
          "Lateral Pass Accuracy"?: number | null
          "Lateral Passes"?: number | null
          "Long Pass %"?: number | null
          "Long Pass Accuracy"?: number | null
          "Long Passes"?: number | null
          "Low Losses"?: number | null
          "Low Recoveries"?: number | null
          "Match Tempo"?: number | null
          "Medium Losses"?: number | null
          "Medium Recoveries"?: number | null
          "Offensive Duels"?: number | null
          "Offensive Duels Success %"?: number | null
          "Offensive Duels Won"?: number | null
          Offsides?: number | null
          "Pass Accuracy"?: number | null
          "Pass to Final Third Accuracy"?: number | null
          "Passes to Final Third"?: number | null
          Penalties?: number | null
          "Penalties Converted"?: number | null
          "Penalty Area Entries (Crosses)"?: number | null
          "Penalty Area Entries (Passes)"?: number | null
          "Penalty Area Entries (Runs)"?: number | null
          "Penalty Success %"?: number | null
          "Points Earned"?: number | null
          "Positional Attacks"?: number | null
          "Positional Attacks Success %"?: number | null
          "Positional Attacks with Shots"?: number | null
          "Possession %"?: number | null
          PPDA?: number | null
          "Progressive Pass Accuracy"?: number | null
          "Progressive Passes"?: number | null
          "Red Cards"?: number | null
          "Set Piece Success %"?: number | null
          "Set Pieces"?: number | null
          "Set Pieces with Shots"?: number | null
          "Shot Accuracy"?: number | null
          "Shots Against"?: number | null
          "Shots Against Accuracy"?: number | null
          "Shots Against on Target"?: number | null
          "Shots on Target"?: number | null
          "Shots Outside Box"?: number | null
          "Shots Outside Box Accuracy"?: number | null
          "Shots Outside Box on Target"?: number | null
          "Sliding Tackle Success %"?: number | null
          "Sliding Tackles"?: number | null
          "Smart Pass Accuracy"?: number | null
          "Smart Passes"?: number | null
          "Successful Sliding Tackles"?: number | null
          Team?: string | null
          team_id?: number | null
          "Throw In Accuracy"?: number | null
          "Throw Ins"?: number | null
          "Total Crosses"?: number | null
          "Total Duels"?: number | null
          "Total Losses"?: number | null
          "Total Passes"?: number | null
          "Total Penalty Area Entries"?: number | null
          "Total Recoveries"?: number | null
          "Total Shots"?: number | null
          "Touches in Penalty Area"?: number | null
          xG?: number | null
          "Yellow Cards"?: number | null
        }
        Update: {
          "Accurate Back Passes"?: number | null
          "Accurate Crosses"?: number | null
          "Accurate Forward Passes"?: number | null
          "Accurate Lateral Passes"?: number | null
          "Accurate Long Passes"?: number | null
          "Accurate Passes"?: number | null
          "Accurate Passes to Final Third"?: number | null
          "Accurate Progressive Passes"?: number | null
          "Accurate Smart Passes"?: number | null
          "Accurate Throw Ins"?: number | null
          "Aerial Duels"?: number | null
          "Aerial Duels Success %"?: number | null
          "Aerial Duels Won"?: number | null
          "Average Pass Length"?: number | null
          "Average Passes per Possession"?: number | null
          "Average Shot Distance"?: number | null
          "Back Pass Accuracy"?: number | null
          "Back Passes"?: number | null
          Clearances?: number | null
          "Conceded Goals"?: number | null
          "Corner Success %"?: number | null
          Corners?: number | null
          "Corners with Shots"?: number | null
          "Counterattack Success %"?: number | null
          Counterattacks?: number | null
          "Counterattacks with Shots"?: number | null
          "Cross Accuracy"?: number | null
          "Deep Completed Crosses"?: number | null
          "Deep Completed Passes"?: number | null
          "Defensive Duels"?: number | null
          "Defensive Duels Success %"?: number | null
          "Defensive Duels Won"?: number | null
          "Duels Success %"?: number | null
          "Duels Won"?: number | null
          "Forward Pass Accuracy"?: number | null
          "Forward Passes"?: number | null
          Fouls?: number | null
          "Free Kick Success %"?: number | null
          "Free Kicks"?: number | null
          "Free Kicks with Shots"?: number | null
          "Goal Kicks"?: number | null
          Goals?: number | null
          "Goals Conceded 0-15"?: number | null
          "Goals Conceded 16-30"?: number | null
          "Goals Conceded 31-45"?: number | null
          "Goals Conceded 46-60"?: number | null
          "Goals Conceded 61-75"?: number | null
          "Goals Conceded 76-90"?: number | null
          "Goals Scored 0-15"?: number | null
          "Goals Scored 16-30"?: number | null
          "Goals Scored 31-45"?: number | null
          "Goals Scored 46-60"?: number | null
          "Goals Scored 61-75"?: number | null
          "Goals Scored 76-90"?: number | null
          "High Losses"?: number | null
          "High Recoveries"?: number | null
          Interceptions?: number | null
          "Lateral Pass Accuracy"?: number | null
          "Lateral Passes"?: number | null
          "Long Pass %"?: number | null
          "Long Pass Accuracy"?: number | null
          "Long Passes"?: number | null
          "Low Losses"?: number | null
          "Low Recoveries"?: number | null
          "Match Tempo"?: number | null
          "Medium Losses"?: number | null
          "Medium Recoveries"?: number | null
          "Offensive Duels"?: number | null
          "Offensive Duels Success %"?: number | null
          "Offensive Duels Won"?: number | null
          Offsides?: number | null
          "Pass Accuracy"?: number | null
          "Pass to Final Third Accuracy"?: number | null
          "Passes to Final Third"?: number | null
          Penalties?: number | null
          "Penalties Converted"?: number | null
          "Penalty Area Entries (Crosses)"?: number | null
          "Penalty Area Entries (Passes)"?: number | null
          "Penalty Area Entries (Runs)"?: number | null
          "Penalty Success %"?: number | null
          "Points Earned"?: number | null
          "Positional Attacks"?: number | null
          "Positional Attacks Success %"?: number | null
          "Positional Attacks with Shots"?: number | null
          "Possession %"?: number | null
          PPDA?: number | null
          "Progressive Pass Accuracy"?: number | null
          "Progressive Passes"?: number | null
          "Red Cards"?: number | null
          "Set Piece Success %"?: number | null
          "Set Pieces"?: number | null
          "Set Pieces with Shots"?: number | null
          "Shot Accuracy"?: number | null
          "Shots Against"?: number | null
          "Shots Against Accuracy"?: number | null
          "Shots Against on Target"?: number | null
          "Shots on Target"?: number | null
          "Shots Outside Box"?: number | null
          "Shots Outside Box Accuracy"?: number | null
          "Shots Outside Box on Target"?: number | null
          "Sliding Tackle Success %"?: number | null
          "Sliding Tackles"?: number | null
          "Smart Pass Accuracy"?: number | null
          "Smart Passes"?: number | null
          "Successful Sliding Tackles"?: number | null
          Team?: string | null
          team_id?: number | null
          "Throw In Accuracy"?: number | null
          "Throw Ins"?: number | null
          "Total Crosses"?: number | null
          "Total Duels"?: number | null
          "Total Losses"?: number | null
          "Total Passes"?: number | null
          "Total Penalty Area Entries"?: number | null
          "Total Recoveries"?: number | null
          "Total Shots"?: number | null
          "Touches in Penalty Area"?: number | null
          xG?: number | null
          "Yellow Cards"?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_latest_players_by_club: {
        Args: { p_club_id: number }
        Returns: {
          id: number
          name: string
          position: string
          stats: Json
          updated_at: string
        }[]
      }
      get_latest_players_for_club: {
        Args: { p_club_id: number }
        Returns: {
          id: number
          name: string
          club_id: number
          player_pos: string
          stats: Json
          created_at: string
          updated_at: string
          on_loan: boolean
          loan_visibility: string
          wyscout_player_id: number
        }[]
      }
      get_my_player_listings: {
        Args: { requesting_club_id: number }
        Returns: {
          listing_id: number
          listed_by_club_id: number
          wyscout_player_id_out: number
          listing_type: string
          status: string
          asking_price: number
          loan_fee: number
          loan_duration: string
          listing_created_at: string
          player_name: string
          player_pos: string
        }[]
      }
      get_player_listings: {
        Args: { requesting_club_id: number; listing_status?: string }
        Returns: {
          listing_id: number
          listed_by_club_id: number
          wyscout_player_id_out: number
          listing_type: string
          status: string
          asking_price: number
          loan_fee: number
          loan_duration: string
          listing_created_at: string
          player_name: string
          player_position: string
          listed_by_club_name: string
        }[]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

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
