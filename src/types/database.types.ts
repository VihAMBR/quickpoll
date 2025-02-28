export interface Poll {
  id: string
  created_at: string
  title: string
  description: string | null
  user_id: string | null
  is_public: boolean
  end_date: string | null
  show_results: boolean
  require_auth: boolean
}

export interface Option {
  id: string
  poll_id: string
  text: string
  created_at: string
}

export interface Vote {
  id: string
  poll_id: string
  option_id: string
  user_id: string | null
  device_fingerprint: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      polls: {
        Row: Poll
        Insert: Omit<Poll, 'id' | 'created_at'>
        Update: Partial<Omit<Poll, 'id' | 'created_at'>>
      }
      options: {
        Row: Option
        Insert: Omit<Option, 'id' | 'created_at'>
        Update: Partial<Omit<Option, 'id' | 'created_at'>>
      }
      votes: {
        Row: Vote
        Insert: Omit<Vote, 'id' | 'created_at'>
        Update: Partial<Omit<Vote, 'id' | 'created_at'>>
      }
    }
  }
}