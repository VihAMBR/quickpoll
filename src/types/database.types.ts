export interface Poll {
  id: string;
  created_at: string;
  title: string;
  created_by: string;
  is_active: boolean;
}

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
}

export interface Vote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
}
