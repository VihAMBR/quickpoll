export interface Database {
  public: {
    Tables: {
      polls: {
        Row: Poll
        Insert: Omit<Poll, 'id' | 'created_at'>
        Update: Partial<Poll>
      }
      options: {
        Row: Option
        Insert: Omit<Option, 'id'>
        Update: Partial<Option>
      }
      votes: {
        Row: Vote
        Insert: Omit<Vote, 'id' | 'created_at'>
        Update: Partial<Vote>
      }
    }
  }
}

export interface Poll {
  id: string
  title: string
  description?: string
  user_id: string
  created_at: string
  end_date?: string
  require_auth: boolean
  show_results: boolean
}

export interface Option {
  id: string
  poll_id: string
  text: string
  order: number
}

export interface Vote {
  id: string
  poll_id: string
  option_id: string
  user_id: string
  created_at: string
}
