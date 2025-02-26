-- Drop the not-null constraint on user_id
ALTER TABLE votes
ALTER COLUMN user_id DROP NOT NULL;

-- Add check constraint to ensure either user_id or client_id is present
ALTER TABLE votes
ADD CONSTRAINT require_user_or_client
CHECK (
    (user_id IS NOT NULL AND client_id IS NULL) OR 
    (user_id IS NULL AND client_id IS NOT NULL)
);
