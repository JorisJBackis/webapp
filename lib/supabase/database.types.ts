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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          admin_level: string | null
          created_at: string | null
          granted_by: string | null
          id: string
        }
        Insert: {
          admin_level?: string | null
          created_at?: string | null
          granted_by?: string | null
          id: string
        }
        Update: {
          admin_level?: string | null
          created_at?: string | null
          granted_by?: string | null
          id?: string
        }
        Relationships: []
      }
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
      agent_rosters: {
        Row: {
          added_at: string | null
          agent_id: string
          created_at: string | null
          id: number
          notes: string | null
          player_id: number
          updated_at: string | null
        }
        Insert: {
          added_at?: string | null
          agent_id: string
          created_at?: string | null
          id?: number
          notes?: string | null
          player_id: number
          updated_at?: string | null
        }
        Update: {
          added_at?: string | null
          agent_id?: string
          created_at?: string | null
          id?: number
          notes?: string | null
          player_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_rosters_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_transfermarkt"
            referencedColumns: ["id"]
          },
        ]
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
      clubs_transfermarkt: {
        Row: {
          competition_id: string | null
          competition_name: string | null
          country: string | null
          created_at: string | null
          id: number
          name: string
        }
        Insert: {
          competition_id?: string | null
          competition_name?: string | null
          country?: string | null
          created_at?: string | null
          id: number
          name: string
        }
        Update: {
          competition_id?: string | null
          competition_name?: string | null
          country?: string | null
          created_at?: string | null
          id?: number
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
      merging_players_names: {
        Row: {
          contract_expires_date: string | null
          id: number
          joined_team_date: string | null
          player_image_url: string | null
          player_profile_url: string | null
          transfermarkt_club_name: string | null
          transfermarkt_player_id: string
          transfermarkt_player_name: string
          wyscout_club_name: string | null
          wyscout_player_id: string
          wyscout_player_name: string
        }
        Insert: {
          contract_expires_date?: string | null
          id?: number
          joined_team_date?: string | null
          player_image_url?: string | null
          player_profile_url?: string | null
          transfermarkt_club_name?: string | null
          transfermarkt_player_id: string
          transfermarkt_player_name: string
          wyscout_club_name?: string | null
          wyscout_player_id: string
          wyscout_player_name: string
        }
        Update: {
          contract_expires_date?: string | null
          id?: number
          joined_team_date?: string | null
          player_image_url?: string | null
          player_profile_url?: string | null
          transfermarkt_club_name?: string | null
          transfermarkt_player_id?: string
          transfermarkt_player_name?: string
          wyscout_club_name?: string | null
          wyscout_player_id?: string
          wyscout_player_name?: string
        }
        Relationships: []
      }
      new_watchlist: {
        Row: {
          assists: number | null
          came_on_as_sub: boolean | null
          foreign_key_id: number | null
          goals: number | null
          home_or_away: string | null
          id: number
          match_date: string
          match_id: string
          match_result: string | null
          minutes_played: number
          opponent: string | null
          player_id: string
          player_name: string
          position_played: string | null
          red_cards: number | null
          shots: number | null
          shots_on_target: number | null
          started: boolean | null
          subbed_off: boolean | null
          substitution_minute: number | null
          team_name: string | null
          yellow_cards: number | null
        }
        Insert: {
          assists?: number | null
          came_on_as_sub?: boolean | null
          foreign_key_id?: number | null
          goals?: number | null
          home_or_away?: string | null
          id?: number
          match_date: string
          match_id: string
          match_result?: string | null
          minutes_played?: number
          opponent?: string | null
          player_id: string
          player_name: string
          position_played?: string | null
          red_cards?: number | null
          shots?: number | null
          shots_on_target?: number | null
          started?: boolean | null
          subbed_off?: boolean | null
          substitution_minute?: number | null
          team_name?: string | null
          yellow_cards?: number | null
        }
        Update: {
          assists?: number | null
          came_on_as_sub?: boolean | null
          foreign_key_id?: number | null
          goals?: number | null
          home_or_away?: string | null
          id?: number
          match_date?: string
          match_id?: string
          match_result?: string | null
          minutes_played?: number
          opponent?: string | null
          player_id?: string
          player_name?: string
          position_played?: string | null
          red_cards?: number | null
          shots?: number | null
          shots_on_target?: number | null
          started?: boolean | null
          subbed_off?: boolean | null
          substitution_minute?: number | null
          team_name?: string | null
          yellow_cards?: number | null
        }
        Relationships: []
      }
      player_applications: {
        Row: {
          applied_at: string | null
          available_from: string | null
          club_notes: string | null
          cover_message: string | null
          decided_at: string | null
          expected_salary: string | null
          id: number
          need_id: number | null
          player_id: string | null
          status: string | null
          viewed_at: string | null
        }
        Insert: {
          applied_at?: string | null
          available_from?: string | null
          club_notes?: string | null
          cover_message?: string | null
          decided_at?: string | null
          expected_salary?: string | null
          id?: number
          need_id?: number | null
          player_id?: string | null
          status?: string | null
          viewed_at?: string | null
        }
        Update: {
          applied_at?: string | null
          available_from?: string | null
          club_notes?: string | null
          cover_message?: string | null
          decided_at?: string | null
          expected_salary?: string | null
          id?: number
          need_id?: number | null
          player_id?: string | null
          status?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_applications_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "recruitment_needs"
            referencedColumns: ["need_id"]
          },
          {
            foreignKeyName: "player_applications_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_data_requests: {
        Row: {
          additional_info: string | null
          admin_notes: string | null
          created_at: string | null
          current_club: string | null
          date_of_birth: string | null
          email: string
          id: string
          nationality: string | null
          player_name: string
          position: string | null
          processed_at: string | null
          requested_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          additional_info?: string | null
          admin_notes?: string | null
          created_at?: string | null
          current_club?: string | null
          date_of_birth?: string | null
          email: string
          id?: string
          nationality?: string | null
          player_name: string
          position?: string | null
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          additional_info?: string | null
          admin_notes?: string | null
          created_at?: string | null
          current_club?: string | null
          date_of_birth?: string | null
          email?: string
          id?: string
          nationality?: string | null
          player_name?: string
          position?: string | null
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
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
      player_profiles: {
        Row: {
          agent_email: string | null
          agent_name: string | null
          agent_phone: string | null
          contract_end_date: string | null
          created_at: string | null
          current_salary_range: string | null
          desired_salary_range: string | null
          email: string | null
          family_status: string | null
          full_name: string | null
          id: string
          instagram_url: string | null
          languages: string[] | null
          last_active: string | null
          looking_status: string | null
          playing_positions: string[] | null
          preferred_countries: string[] | null
          preferred_leagues: string[] | null
          preferred_playing_style: string | null
          profile_completeness: number | null
          profile_photo_url: string | null
          profile_views: number | null
          relocation_preference: string | null
          transfermarkt_link: string | null
          updated_at: string | null
          verified: boolean | null
          wyscout_player_id: number | null
          youtube_highlight_url: string | null
        }
        Insert: {
          agent_email?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          contract_end_date?: string | null
          created_at?: string | null
          current_salary_range?: string | null
          desired_salary_range?: string | null
          email?: string | null
          family_status?: string | null
          full_name?: string | null
          id: string
          instagram_url?: string | null
          languages?: string[] | null
          last_active?: string | null
          looking_status?: string | null
          playing_positions?: string[] | null
          preferred_countries?: string[] | null
          preferred_leagues?: string[] | null
          preferred_playing_style?: string | null
          profile_completeness?: number | null
          profile_photo_url?: string | null
          profile_views?: number | null
          relocation_preference?: string | null
          transfermarkt_link?: string | null
          updated_at?: string | null
          verified?: boolean | null
          wyscout_player_id?: number | null
          youtube_highlight_url?: string | null
        }
        Update: {
          agent_email?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          contract_end_date?: string | null
          created_at?: string | null
          current_salary_range?: string | null
          desired_salary_range?: string | null
          email?: string | null
          family_status?: string | null
          full_name?: string | null
          id?: string
          instagram_url?: string | null
          languages?: string[] | null
          last_active?: string | null
          looking_status?: string | null
          playing_positions?: string[] | null
          preferred_countries?: string[] | null
          preferred_leagues?: string[] | null
          preferred_playing_style?: string | null
          profile_completeness?: number | null
          profile_photo_url?: string | null
          profile_views?: number | null
          relocation_preference?: string | null
          transfermarkt_link?: string | null
          updated_at?: string | null
          verified?: boolean | null
          wyscout_player_id?: number | null
          youtube_highlight_url?: string | null
        }
        Relationships: []
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
      players_transfermarkt: {
        Row: {
          age: number | null
          agent_notes: string | null
          club_id: number | null
          contract_expires: string | null
          created_at: string | null
          foot: string | null
          height: number | null
          id: number
          is_eu_passport: boolean | null
          main_position: string | null
          market_value_eur: number | null
          name: string
          nationality: string | null
          player_agent: string | null
          sf_data: Json | null
          sofascore_id: number | null
          source: string | null
          tm_data: Json | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          agent_notes?: string | null
          club_id?: number | null
          contract_expires?: string | null
          created_at?: string | null
          foot?: string | null
          height?: number | null
          id: number
          is_eu_passport?: boolean | null
          main_position?: string | null
          market_value_eur?: number | null
          name: string
          nationality?: string | null
          player_agent?: string | null
          sf_data?: Json | null
          sofascore_id?: number | null
          source?: string | null
          tm_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          agent_notes?: string | null
          club_id?: number | null
          contract_expires?: string | null
          created_at?: string | null
          foot?: string | null
          height?: number | null
          id?: number
          is_eu_passport?: boolean | null
          main_position?: string | null
          market_value_eur?: number | null
          name?: string
          nationality?: string | null
          player_agent?: string | null
          sf_data?: Json | null
          sofascore_id?: number | null
          source?: string | null
          tm_data?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_transfermarkt_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_transfermarkt"
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
      profile_views: {
        Row: {
          id: number
          player_id: string | null
          source: string | null
          view_duration_seconds: number | null
          viewed_at: string | null
          viewer_club_id: number | null
        }
        Insert: {
          id?: number
          player_id?: string | null
          source?: string | null
          view_duration_seconds?: number | null
          viewed_at?: string | null
          viewer_club_id?: number | null
        }
        Update: {
          id?: number
          player_id?: string | null
          source?: string | null
          view_duration_seconds?: number | null
          viewed_at?: string | null
          viewer_club_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_club_id_fkey"
            columns: ["viewer_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_notes: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          club_id: number | null
          created_at: string
          email: string | null
          id: string
          registration_note: string | null
          rejection_reason: string | null
          updated_at: string
          user_type: string | null
        }
        Insert: {
          admin_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          club_id?: number | null
          created_at?: string
          email?: string | null
          id: string
          registration_note?: string | null
          rejection_reason?: string | null
          updated_at?: string
          user_type?: string | null
        }
        Update: {
          admin_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          club_id?: number | null
          created_at?: string
          email?: string | null
          id?: string
          registration_note?: string | null
          rejection_reason?: string | null
          updated_at?: string
          user_type?: string | null
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
      salary_estimation_requests: {
        Row: {
          club_id: number | null
          created_at: string
          id: number
          player_id: number | null
          player_name: string
          request_type: string | null
          user_email: string
        }
        Insert: {
          club_id?: number | null
          created_at?: string
          id?: number
          player_id?: number | null
          player_name: string
          request_type?: string | null
          user_email: string
        }
        Update: {
          club_id?: number | null
          created_at?: string
          id?: number
          player_id?: number | null
          player_name?: string
          request_type?: string | null
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_suggestions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_estimation_requests_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
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
          "Draw Probability": number | null
          "Duels Success %": number | null
          "Duels Won": number | null
          "Expected Points": number | null
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
          "Loss Probability": number | null
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
          "Win Probability": number | null
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
          "Draw Probability"?: number | null
          "Duels Success %"?: number | null
          "Duels Won"?: number | null
          "Expected Points"?: number | null
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
          "Loss Probability"?: number | null
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
          "Win Probability"?: number | null
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
          "Draw Probability"?: number | null
          "Duels Success %"?: number | null
          "Duels Won"?: number | null
          "Expected Points"?: number | null
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
          "Loss Probability"?: number | null
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
          "Win Probability"?: number | null
          xG?: number | null
          "Yellow Cards"?: number | null
        }
        Relationships: []
      }
      transfermarkt_matches_data: {
        Row: {
          assists: number | null
          came_on_as_substitute: boolean | null
          goals: number | null
          home_or_away: string | null
          id: number
          match_date: string | null
          match_id: string | null
          match_result: string | null
          match_total_time: number | null
          minutes_played: number | null
          opponent: string | null
          player_name: string | null
          position_played: string | null
          red_cards: number | null
          shots: number | null
          shots_on_target: number | null
          started: boolean | null
          subbed_off: boolean | null
          substitution_minute: number | null
          team_name: string | null
          transfermarkt_player_id: string | null
          yellow_cards: number | null
        }
        Insert: {
          assists?: number | null
          came_on_as_substitute?: boolean | null
          goals?: number | null
          home_or_away?: string | null
          id?: number
          match_date?: string | null
          match_id?: string | null
          match_result?: string | null
          match_total_time?: number | null
          minutes_played?: number | null
          opponent?: string | null
          player_name?: string | null
          position_played?: string | null
          red_cards?: number | null
          shots?: number | null
          shots_on_target?: number | null
          started?: boolean | null
          subbed_off?: boolean | null
          substitution_minute?: number | null
          team_name?: string | null
          transfermarkt_player_id?: string | null
          yellow_cards?: number | null
        }
        Update: {
          assists?: number | null
          came_on_as_substitute?: boolean | null
          goals?: number | null
          home_or_away?: string | null
          id?: number
          match_date?: string | null
          match_id?: string | null
          match_result?: string | null
          match_total_time?: number | null
          minutes_played?: number | null
          opponent?: string | null
          player_name?: string | null
          position_played?: string | null
          red_cards?: number | null
          shots?: number | null
          shots_on_target?: number | null
          started?: boolean | null
          subbed_off?: boolean | null
          substitution_minute?: number | null
          team_name?: string | null
          transfermarkt_player_id?: string | null
          yellow_cards?: number | null
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
      approved_users: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          approved_by_email: string | null
          club_id: number | null
          club_name: string | null
          email: string | null
          email_confirmed_at: string | null
          id: string | null
          player_name: string | null
          registered_at: string | null
          registration_note: string | null
          transfermarkt_link: string | null
          user_type: string | null
          wyscout_player_id: number | null
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
      pending_user_approvals: {
        Row: {
          approval_status: string | null
          club_id: number | null
          club_name: string | null
          email: string | null
          email_confirmed_at: string | null
          id: string | null
          player_name: string | null
          registered_at: string | null
          registration_note: string | null
          transfermarkt_link: string | null
          user_type: string | null
          wyscout_player_id: number | null
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
      rejected_users: {
        Row: {
          admin_notes: string | null
          club_id: number | null
          club_name: string | null
          email: string | null
          email_confirmed_at: string | null
          id: string | null
          player_name: string | null
          registered_at: string | null
          registration_note: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejected_by_email: string | null
          rejection_reason: string | null
          transfermarkt_link: string | null
          user_type: string | null
          wyscout_player_id: number | null
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
    }
    Functions: {
      add_player_to_roster: {
        Args: { p_agent_id: string; p_notes?: string; p_player_id: number }
        Returns: Json
      }
      approve_user: {
        Args: { admin_notes_text?: string; target_user_id: string }
        Returns: undefined
      }
      change_user_status: {
        Args: {
          admin_notes_text?: string
          new_status: string
          reason_text?: string
          target_user_id: string
        }
        Returns: undefined
      }
      get_agent_roster: {
        Args: { p_agent_id: string }
        Returns: {
          added_at: string
          age: number
          agent_notes: string
          club_id: number
          club_name: string
          contract_expires: string
          foot: string
          height: number
          is_eu_passport: boolean
          market_value_eur: number
          nationality: string
          player_id: number
          player_name: string
          position: string
          roster_id: number
          updated_at: string
        }[]
      }
      get_latest_players_for_club: {
        Args: { p_club_id: number }
        Returns: {
          club_id: number
          created_at: string
          id: number
          listing_status: string
          name: string
          player_league_name: string
          player_pos: string
          stats: Json
          updated_at: string
          wyscout_player_id: number
        }[]
      }
      get_metric_averages_for_position_league: {
        Args: { p_league_name: string; p_position_name: string }
        Returns: {
          average_value: number | null
          last_calculated: string | null
          league_name: string
          metric_name: string
          position: string
        }[]
        SetofOptions: {
          from: "*"
          to: "league_position_metric_averages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_player_listings: {
        Args: { requesting_club_id: number }
        Returns: {
          asking_price: number
          listed_by_club_id: number
          listing_created_at: string
          listing_id: number
          listing_type: string
          loan_duration: string
          loan_fee: number
          player_name: string
          player_pos: string
          status: string
          wyscout_player_id_out: number
        }[]
      }
      get_my_recruitment_needs: {
        Args: { p_requesting_club_id: number }
        Returns: {
          budget_loan_fee_max: number
          budget_transfer_max: number
          created_by_club_id: number
          max_age: number
          max_height: number
          min_age: number
          min_height: number
          need_created_at: string
          need_id: number
          notes: string
          position_needed: string
          preferred_foot: string
          salary_range: string
          status: string
        }[]
      }
      get_player_listings: {
        Args: { listing_status?: string; requesting_club_id: number }
        Returns: {
          asking_price: number
          listed_by_club_id: number
          listed_by_club_name: string
          listing_created_at: string
          listing_id: number
          listing_type: string
          loan_duration: string
          loan_fee: number
          player_name: string
          player_position: string
          status: string
          wyscout_player_id_out: number
        }[]
      }
      get_recruitment_needs: {
        Args: { p_requesting_club_id: number }
        Returns: {
          budget_loan_fee_max: number
          budget_transfer_max: number
          created_by_club_id: number
          max_age: number
          max_height: number
          min_age: number
          min_height: number
          need_created_at: string
          need_id: number
          notes: string
          position_needed: string
          posting_club_name: string
          preferred_foot: string
          salary_range: string
        }[]
      }
      get_scouting_players: {
        Args: {
          p_contract_end?: string
          p_contract_start?: string
          p_foot_filter?: string
          p_league_filter?: string
          p_limit?: number
          p_max_height?: number
          p_min_height?: number
          p_name_filter?: string
          p_offset?: number
          p_position_filter?: string
          p_requesting_club_id: number
          p_sort_column?: string
          p_sort_direction?: string
        }
        Returns: {
          age: number
          avg_percentile: number
          club_id: number
          club_name: string
          contract_expiry: string
          foot: string
          height: number
          listing_status: string
          name: string
          player_id: number
          player_league_name: string
          player_pos: string
          stats: Json
          total_count: number
          updated_at: string
          wyscout_player_id: number
        }[]
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      match_player_name: {
        Args: { player_name: string; watchlist_name: string }
        Returns: boolean
      }
      match_roster_with_needs: {
        Args: { p_agent_id: string }
        Returns: {
          club_name: string
          match_reasons: Json
          matched_player_id: number
          matched_player_name: string
          max_age: number
          max_height: number
          min_age: number
          min_height: number
          need_id: number
          position_needed: string
          preferred_foot: string
        }[]
      }
      reject_user: {
        Args: {
          admin_notes_text?: string
          reason: string
          target_user_id: string
        }
        Returns: undefined
      }
      remove_player_from_roster: {
        Args: { p_agent_id: string; p_player_id: number }
        Returns: boolean
      }
      try_cast_to_date: { Args: { p_text: string }; Returns: string }
      update_league_position_averages: { Args: never; Returns: undefined }
      update_roster_notes: {
        Args: { p_agent_id: string; p_notes: string; p_player_id: number }
        Returns: boolean
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
