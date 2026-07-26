insert into tasks (title, description, status, priority) values
  ('Ship auth hotfix',            'Session cookie flag flipped in staging — needs prod.', 'ready',    0),
  ('Write onboarding docs',       'Cold-start setup for a new contributor.',              'ready',    3),
  ('Implement task API',          'Express + Drizzle CRUD with zod validation.',          'code',     1),
  ('Build board UI',              'Four columns, cards, create modal.',                   'code',     2),
  ('Review CI pipeline changes',  'Lint + typecheck + tests on PR.',                      'review',   2),
  ('Pick Postgres major',         'Went with 18 — pg_upgrade-friendly mount layout.',     'complete', 4),
  ('Choose package manager',      'Settled on pnpm for cheap worktrees.',                 'complete', 5);

insert into tasks (title, description, status, priority, deleted_at) values
  ('Draft initial plan', 'Superseded by build-plan v2.', 'complete', 3, now());
