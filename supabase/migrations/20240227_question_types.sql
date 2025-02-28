-- Add question_type enum
create type question_type as enum (
  'multiple_choice',
  'true_false',
  'short_answer',
  'ranking',
  'rating'
);

-- Add question_type and rating_scale_max to polls table
alter table polls add column question_type question_type not null default 'multiple_choice';
alter table polls add column rating_scale_max integer check (rating_scale_max between 1 and 10);

-- Add text_answers table for short answer responses
create table text_answers (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid references polls(id) on delete cascade not null,
  answer text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id) on delete set null,
  device_id text
);

-- Add ranking_answers table for ranking responses
create table ranking_answers (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid references polls(id) on delete cascade not null,
  option_id uuid references poll_options(id) on delete cascade not null,
  rank integer not null check (rank > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id) on delete set null,
  device_id text,
  unique(poll_id, option_id, created_by, device_id)
);

-- Add rating_answers table for rating responses
create table rating_answers (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid references polls(id) on delete cascade not null,
  rating integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id) on delete set null,
  device_id text,
  unique(poll_id, created_by, device_id)
);

-- Add RLS policies
alter table text_answers enable row level security;
alter table ranking_answers enable row level security;
alter table rating_answers enable row level security;

create policy "Anyone can insert text answers"
  on text_answers for insert
  to authenticated, anon
  with check (true);

create policy "Anyone can view text answers"
  on text_answers for select
  to authenticated, anon
  using (true);

create policy "Anyone can insert ranking answers"
  on ranking_answers for insert
  to authenticated, anon
  with check (true);

create policy "Anyone can view ranking answers"
  on ranking_answers for select
  to authenticated, anon
  using (true);

create policy "Anyone can insert rating answers"
  on rating_answers for insert
  to authenticated, anon
  with check (true);

create policy "Anyone can view rating answers"
  on rating_answers for select
  to authenticated, anon
  using (true);

-- Function to export poll results
create or replace function export_poll_results(poll_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  poll_data json;
  poll_type question_type;
begin
  -- Get poll type
  select question_type into poll_type from polls where id = poll_id;
  
  -- Base poll information
  select json_build_object(
    'poll_id', p.id,
    'title', p.title,
    'description', p.description,
    'question_type', p.question_type,
    'created_at', p.created_at,
    'total_views', (select count(*) from poll_views where poll_id = p.id),
    'options', case 
      when p.question_type in ('multiple_choice', 'true_false', 'ranking') then
        (select json_agg(json_build_object(
          'id', po.id,
          'text', po.text,
          'votes', case 
            when p.question_type = 'ranking' then
              (select json_agg(json_build_object(
                'rank', ra.rank,
                'count', count(*)
              ))
              from ranking_answers ra
              where ra.option_id = po.id
              group by ra.rank)
            else
              (select count(*) from votes v where v.option_id = po.id)
          end
        ))
        from poll_options po
        where po.poll_id = p.id)
      else '[]'::json
    end,
    'text_answers', case
      when p.question_type = 'short_answer' then
        (select json_agg(json_build_object(
          'answer', ta.answer,
          'created_at', ta.created_at
        ))
        from text_answers ta
        where ta.poll_id = p.id)
      else '[]'::json
    end,
    'rating_summary', case
      when p.question_type = 'rating' then
        (select json_build_object(
          'average', avg(rating)::numeric(10,2),
          'distribution', json_agg(json_build_object(
            'rating', rating,
            'count', count(*)
          ))
        )
        from rating_answers ra
        where ra.poll_id = p.id
        group by ra.poll_id)
      else '{}'::json
    end
  ) into poll_data
  from polls p
  where p.id = poll_id;

  return poll_data;
end;
$$;
