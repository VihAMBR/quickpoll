export interface Poll {
  id: string
  title: string
  description: string | null
  created_by: string | null
  created_at: string
  end_date: string | null
  show_results: boolean
  require_auth: boolean
}

export interface Option {
  id: string
  poll_id: string
  text: string
}

export interface Vote {
  id: string
  poll_id: string
  option_id: string
  user_id: string | null
  client_id: string | null
  created_at: string
}