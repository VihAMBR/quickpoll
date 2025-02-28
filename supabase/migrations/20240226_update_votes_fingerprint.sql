-- Drop the existing client_id column and add device_fingerprint
ALTER TABLE votes
DROP COLUMN client_id,
ADD COLUMN device_fingerprint text;

-- Update the unique constraint
ALTER TABLE votes
DROP CONSTRAINT IF EXISTS votes_poll_id_user_id_client_id_key;

ALTER TABLE votes
ADD CONSTRAINT votes_poll_id_user_id_device_fingerprint_key 
UNIQUE (poll_id, user_id, device_fingerprint);
