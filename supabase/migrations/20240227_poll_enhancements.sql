-- Add multiple choice and image support to polls
ALTER TABLE polls
ADD COLUMN allow_multiple_choices boolean DEFAULT false,
ADD COLUMN max_choices integer DEFAULT 1;

-- Add image support to poll options
ALTER TABLE poll_options
ADD COLUMN image_url text;

-- Add view tracking
CREATE TABLE poll_views (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id uuid REFERENCES polls(id) ON DELETE CASCADE,
    device_fingerprint text,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(poll_id, device_fingerprint)
);

-- Add RLS policies for poll_views
ALTER TABLE poll_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous users to create views"
    ON poll_views FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to create views"
    ON poll_views FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow users to read views for their polls"
    ON poll_views FOR SELECT
    TO authenticated
    USING (poll_id IN (
        SELECT id FROM polls WHERE created_by = auth.uid()
    ));

-- Add functions to get poll metrics
CREATE OR REPLACE FUNCTION get_poll_metrics(poll_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total_views', (SELECT COUNT(DISTINCT device_fingerprint) FROM poll_views WHERE poll_views.poll_id = $1),
        'total_votes', (SELECT COUNT(DISTINCT device_fingerprint) FROM votes WHERE votes.poll_id = $1),
        'conversion_rate', CASE 
            WHEN (SELECT COUNT(DISTINCT device_fingerprint) FROM poll_views WHERE poll_views.poll_id = $1) = 0 THEN 0
            ELSE ROUND(
                (SELECT COUNT(DISTINCT device_fingerprint)::numeric FROM votes WHERE votes.poll_id = $1) /
                (SELECT COUNT(DISTINCT device_fingerprint)::numeric FROM poll_views WHERE poll_views.poll_id = $1) * 100,
                2
            )
        END
    ) INTO result;
    
    RETURN result;
END;
$$;
