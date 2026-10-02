-- Reference data required before the app can run.
set search_path = imari, public;

insert into domains (id, name, code, description, sort_order) values
  ('budgeting', 'Budgeting',                'BU', 'Planning income and spending month to month', 1),
  ('saving',    'Saving & emergency funds', 'SA', 'Building buffers and saving habits',          2),
  ('debt',      'Debt & interest',          'DE', 'Borrowing responsibly and understanding cost', 3),
  ('investing', 'Investing basics',         'IN', 'Risk, return and long-term growth',           4),
  ('digital',   'Digital money safety',     'DI', 'Mobile money, scams and privacy',             5)
on conflict (id) do nothing;

insert into institutions (name, slug) values
  ('African Leadership University', 'alu'),
  ('University of Rwanda', 'university-of-rwanda'),
  ('Adventist University of Central Africa', 'auca'),
  ('Carnegie Mellon University Africa', 'cmu-africa'),
  ('Mount Kenya University Rwanda', 'mku-rwanda')
on conflict (slug) do nothing;

insert into platform_settings (key, value) values
  ('recommendation.threshold', '60'),
  ('credential.chain', '{"chainId": 11155111, "network": "sepolia"}'),
  ('cookie.policy_version', '"2026-09"')
on conflict (key) do nothing;
