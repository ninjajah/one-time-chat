import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Типы для TypeScript
export interface Database {
  public: {
    Tables: {
      chats: {
        Row: {
          id: string
          created_at: string
          expires_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          expires_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          expires_at?: string
          is_active?: boolean
        }
      }
      chat_participants: {
        Row: {
          id: string
          chat_id: string
          user_name: string
          joined_at: string
          is_online: boolean
          session_id: string
        }
        Insert: {
          id?: string
          chat_id: string
          user_name: string
          joined_at?: string
          is_online?: boolean
          session_id: string
        }
        Update: {
          id?: string
          chat_id?: string
          user_name?: string
          joined_at?: string
          is_online?: boolean
          session_id?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          chat_id: string
          participant_id: string | null
          message_type: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          participant_id?: string | null
          message_type?: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          participant_id?: string | null
          message_type?: string
          content?: string
          created_at?: string
        }
      }
    }
  }
}