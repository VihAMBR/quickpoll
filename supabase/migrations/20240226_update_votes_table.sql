-- Update votes table to handle anonymous voting better
ALTER TABLE votes
ADD COLUMN client_id UUID NULL,
DROP COLUMN anonymous;

-- Add unique constraint to prevent duplicate votes
ALTER TABLE votes
ADD CONSTRAINT unique_vote_per_user_or_client
UNIQUE (poll_id, COALESCE(user_id::text, client_id::text));
