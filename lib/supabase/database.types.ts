export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      clubs: {
        Row: {
          id: number
          name: string
          logo_url: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          logo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          logo_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          id: number
          name: string
          club_id: number
          position: string
          stats: Json
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          club_id: number
          position: string
          stats?: Json
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          club_id?: number
          position?: string
          stats?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_club_id_fkey"
            columns: ["club_id"]
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          club_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          club_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          club_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_club_id_fkey"
            columns: ["club_id"]
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

