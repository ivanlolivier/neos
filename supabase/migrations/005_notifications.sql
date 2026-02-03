-- Notification inbox
-- Table, RLS, indexes, and triggers for likes + announcements

-- 1. Table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('like', 'training_reminder', 'weekend_plan', 'streak_warning', 'announcement')),
  title text not null,
  body text not null default '',
  data jsonb default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Indexes
create index idx_notifications_user_unread on public.notifications (user_id, is_read);
create index idx_notifications_user_created on public.notifications (user_id, created_at desc);

-- 3. RLS
alter table public.notifications enable row level security;

create policy "Users can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Authenticated users can insert notifications"
  on public.notifications for insert
  with check (auth.role() = 'authenticated');

-- 4. Trigger: notify on post like (skip self-likes)
create or replace function public.notify_post_like()
returns trigger
language plpgsql
security definer
as $$
declare
  post_owner_id uuid;
  liker_name text;
begin
  -- Get the post owner
  select user_id into post_owner_id
  from public.posts
  where id = NEW.post_id;

  -- Skip self-likes
  if post_owner_id = NEW.user_id then
    return NEW;
  end if;

  -- Get the liker's name
  select full_name into liker_name
  from public.profiles
  where id = NEW.user_id;

  -- Create notification
  insert into public.notifications (user_id, type, title, body, data)
  values (
    post_owner_id,
    'like',
    'Nuevo like',
    coalesce(liker_name, 'Alguien') || ' le dio like a tu publicación',
    jsonb_build_object('post_id', NEW.post_id, 'liker_id', NEW.user_id)
  );

  return NEW;
end;
$$;

create trigger trg_notify_post_like
  after insert on public.post_likes
  for each row
  execute function public.notify_post_like();

-- 5. Trigger: notify all users on new announcement
create or replace function public.notify_announcement()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.notifications (user_id, type, title, body, data)
  select
    p.id,
    'announcement',
    'Nuevo anuncio',
    NEW.title,
    jsonb_build_object('announcement_id', NEW.id)
  from public.profiles p
  where p.id != coalesce(NEW.author_id, '00000000-0000-0000-0000-000000000000');

  return NEW;
end;
$$;

create trigger trg_notify_announcement
  after insert on public.announcements
  for each row
  execute function public.notify_announcement();
