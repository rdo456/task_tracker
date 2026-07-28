create table task_event_types (
  key   text primary key,
  label text not null
);

insert into task_event_types (key, label) values
  ('archived', 'Archived');

create table task_events (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  event_type text not null references task_event_types(key),
  created_at timestamptz not null default now()
);

create index task_events_task_id_idx on task_events (task_id, created_at desc);
