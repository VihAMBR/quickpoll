export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'ranking' | 'rating';

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
  allow_multiple_choices: boolean
  max_choices: number
  question_type: QuestionType
  rating_scale_max: number | null
  metrics?: PollMetrics
}

export interface PollMetrics {
  total_views: number
  total_votes: number
  conversion_rate: number
}

export interface Option {
  id: string
  poll_id: string
  text: string
  created_at: string
  image_url: string | null
}

export interface Vote {
  id: string
  poll_id: string
  option_id: string
  user_id: string | null
  device_fingerprint: string | null
  created_at: string
}

export interface TextAnswer {
  id: string
  poll_id: string
  answer: string
  created_at: string
  created_by: string | null
  device_id: string | null
}

export interface RankingAnswer {
  id: string
  poll_id: string
  option_id: string
  rank: number
  created_at: string
  created_by: string | null
  device_id: string | null
}

export interface RatingAnswer {
  id: string
  poll_id: string
  rating: number
  created_at: string
  created_by: string | null
  device_id: string | null
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
      poll_views: {
        Row: {
          id: string
          poll_id: string
          device_fingerprint: string | null
          user_id: string | null
          created_at: string
        }
        Insert: Omit<{
          id: string
          poll_id: string
          device_fingerprint: string | null
          user_id: string | null
          created_at: string
        }, 'id' | 'created_at'>
        Update: Partial<Omit<{
          id: string
          poll_id: string
          device_fingerprint: string | null
          user_id: string | null
          created_at: string
        }, 'id' | 'created_at'>>
      }
      text_answers: {
        Row: TextAnswer
        Insert: Omit<TextAnswer, 'id' | 'created_at'>
        Update: Partial<Omit<TextAnswer, 'id' | 'created_at'>>
      }
      ranking_answers: {
        Row: RankingAnswer
        Insert: Omit<RankingAnswer, 'id' | 'created_at'>
        Update: Partial<Omit<RankingAnswer, 'id' | 'created_at'>>
      }
      rating_answers: {
        Row: RatingAnswer
        Insert: Omit<RatingAnswer, 'id' | 'created_at'>
        Update: Partial<Omit<RatingAnswer, 'id' | 'created_at'>>
      }
    }
    Functions: {
      export_poll_results: {
        Args: { poll_id: string }
        Returns: JSON
      }
    }
  }
}