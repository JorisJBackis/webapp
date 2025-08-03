export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agency_rb_prospects: {
        Row: {
          accurate_crosses_pct: number | null
          accurate_passes_pct: number | null
          age: number | null
          assists: number | null
          contract_expires: string | null
          defensive_duels_won_pct: number | null
          foot: string | null
          footy_labs_score: number | null
          goals: number | null
          height: number | null
          instagram_url: string | null
          key_passes_p90: number | null
          market_value: number | null
          matches_played: number | null
          on_loan: string | null
          original_league_name: string | null
          original_team_name: string | null
          passport_country: string | null
          player_name: string | null
          position_excel: string | null
          reached_out_on: string | null
          successful_defensive_actions_p90: number | null
          their_response: string | null
          transfermarkt_url: string | null
          weight: number | null
          xa_p90: number | null
        }
        Insert: {
          accurate_crosses_pct?: number | null
          accurate_passes_pct?: number | null
          age?: number | null
          assists?: number | null
          contract_expires?: string | null
          defensive_duels_won_pct?: number | null
          foot?: string | null
          footy_labs_score?: number | null
          goals?: number | null
          height?: number | null
          instagram_url?: string | null
          key_passes_p90?: number | null
          market_value?: number | null
          matches_played?: number | null
          on_loan?: string | null
          original_league_name?: string | null
          original_team_name?: string | null
          passport_country?: string | null
          player_name?: string | null
          position_excel?: string | null
          reached_out_on?: string | null
          successful_defensive_actions_p90?: number | null
          their_response?: string | null
          transfermarkt_url?: string | null
          weight?: number | null
          xa_p90?: number | null
        }
        Update: {
          accurate_crosses_pct?: number | null
          accurate_passes_pct?: number | null
          age?: number | null
          assists?: number | null
          contract_expires?: string | null
          defensive_duels_won_pct?: number | null
          foot?: string | null
          footy_labs_score?: number | null
          goals?: number | null
          height?: number | null
          instagram_url?: string | null
          key_passes_p90?: number | null
          market_value?: number | null
          matches_played?: number | null
          on_loan?: string | null
          original_league_name?: string | null
          original_team_name?: string | null
          passport_country?: string | null
          player_name?: string | null
          position_excel?: string | null
          reached_out_on?: string | null
          successful_defensive_actions_p90?: number | null
          their_response?: string | null
          transfermarkt_url?: string | null
          weight?: number | null
          xa_p90?: number | null
        }
        Relationships: []
      }
      club_reviews: {
        Row: {
          category_ratings: Json | null
          club_id: number
          comment: string | null
          created_at: string | null
          id: number
          overall_rating: number
        }
        Insert: {
          category_ratings?: Json | null
          club_id: number
          comment?: string | null
          created_at?: string | null
          id?: number
          overall_rating: number
        }
        Update: {
          category_ratings?: Json | null
          club_id?: number
          comment?: string | null
          created_at?: string | null
          id?: number
          overall_rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "club_reviews_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          id: number
          league: string | null
          league_id: number | null
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          league?: string | null
          league_id?: number | null
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          league?: string | null
          league_id?: number | null
          logo_url?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "clubs_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
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
      leagues: {
        Row: {
          country: string | null
          created_at: string | null
          division_name: string | null
          id: number
          logo_url: string | null
          name: string
          number_of_teams: number | null
          tier: number | null
          total_games_per_season: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          division_name?: string | null
          id?: number
          logo_url?: string | null
          name: string
          number_of_teams?: number | null
          tier?: number | null
          total_games_per_season?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          division_name?: string | null
          id?: number
          logo_url?: string | null
          name?: string
          number_of_teams?: number | null
          tier?: number | null
          total_games_per_season?: number | null
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
          name: string
          position: string
          stats: Json
          updated_at: string
          wyscout_player_id: number | null
        }
        Insert: {
          club_id?: number | null
          created_at?: string
          id?: number
          name: string
          position: string
          stats?: Json
          updated_at?: string
          wyscout_player_id?: number | null
        }
        Update: {
          club_id?: number | null
          created_at?: string
          id?: number
          name?: string
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
      previous_years_positions: {
        Row: {
          "Goals Conceded (Įv -)": number | null
          "Goals Scored (Įv +)": number | null
          name: string | null
          Points: number | null
          Position: number | null
          Team: string | null
          team_id: number | null
          uid: string
          Year: number | null
        }
        Insert: {
          "Goals Conceded (Įv -)"?: number | null
          "Goals Scored (Įv +)"?: number | null
          name?: string | null
          Points?: number | null
          Position?: number | null
          Team?: string | null
          team_id?: number | null
          uid: string
          Year?: number | null
        }
        Update: {
          "Goals Conceded (Įv -)"?: number | null
          "Goals Scored (Įv +)"?: number | null
          name?: string | null
          Points?: number | null
          Position?: number | null
          Team?: string | null
          team_id?: number | null
          uid?: string
          Year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "previous_years_positions_team_id_fkey"
            columns: ["team_id"]
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
          League: string | null
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
          League?: string | null
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
          League?: string | null
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
      watchlist: {
        Row: {
          club_id: number
          created_at: string | null
          id: number
          player_id: number
        }
        Insert: {
          club_id: number
          created_at?: string | null
          id?: number
          player_id: number
        }
        Update: {
          club_id?: number
          created_at?: string | null
          id?: number
          player_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
          wyscout_player_id: number
          listing_status: string
          player_league_name: string
        }[]
      }
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
      get_scouting_players: {
        Args: {
          p_requesting_club_id: number
          p_name_filter?: string
          p_position_filter?: string
          p_min_height?: number
          p_max_height?: number
          p_foot_filter?: string
          p_sort_column?: string
          p_sort_direction?: string
          p_contract_start?: string
          p_contract_end?: string
          p_limit?: number
          p_offset?: number
          p_league_filter?: string
        }
        Returns: {
          player_id: number
          wyscout_player_id: number
          name: string
          club_id: number
          player_pos: string
          stats: Json
          updated_at: string
          age: number
          height: number
          foot: string
          contract_expiry: string
          avg_percentile: number
          club_name: string
          listing_status: string
          player_league_name: string
          total_count: number
        }[]
      }
      try_cast_to_date: {
        Args: { p_text: string }
        Returns: string
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
      review_category:
        | "Salary Punctuality"
        | "Training Conditions"
        | "Club Management"
        | "Fair Salary"
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
      listing_status_enum: ["active", "inactive", "completed"],
      listing_type_enum: ["loan", "transfer"],
      loan_visibility_enum: ["clubs", "agents", "both"],
      review_category: [
        "Salary Punctuality",
        "Training Conditions",
        "Club Management",
        "Fair Salary",
      ],
    },
  },
} as const
