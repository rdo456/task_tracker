create table task_statuses (
  key        text primary key,
  label      text not null,
  sort_order int  not null unique
);

insert into task_statuses (key, label, sort_order) values
  ('ready',    'Ready',     1),
  ('code',     'In Code',   2),
  ('review',   'In Review', 3),
  ('complete', 'Complete',  4);

create sequence task_key_seq;

create table tasks (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null default 'TASK-' || nextval('task_key_seq'),
  title       text not null,
  description text,
  status      text not null default 'ready' references task_statuses(key),
  priority    smallint not null default 3 check (priority between 0 and 5),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index tasks_status_active_idx on tasks (status) where deleted_at is null;
