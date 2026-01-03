-- Seed schedule data
-- day_of_week: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
-- week_of_cycle: 1, 2, 3, or 4

-- Helper: Get activity ID by name
-- We'll use subqueries to reference activities by name

-- Rabbit
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, person, day, week FROM activities,
  (VALUES
    ('Ivor', 0, 1), ('Ivor', 1, 1), ('Thomas', 2, 1), ('Thomas', 3, 1), ('Ivor', 4, 1), ('Ivor', 5, 1), ('Ivor', 6, 1),
    ('Axel', 0, 2), ('Axel', 1, 2), ('Thomas', 2, 2), ('Thomas', 3, 2), ('Thomas', 4, 2), ('Thomas', 5, 2), ('Thomas', 6, 2),
    ('Axel', 0, 3), ('Axel', 1, 3), ('Thomas', 2, 3), ('Thomas', 3, 3), ('Axel', 4, 3), ('Axel', 5, 3), ('Axel', 6, 3),
    ('Ivor', 0, 4), ('Ivor', 1, 4), ('Thomas', 2, 4), ('Thomas', 3, 4), ('Thomas', 4, 4), ('Thomas', 5, 4), ('Thomas', 6, 4)
  ) AS s(person, day, week)
WHERE activities.name = 'Rabbit';

-- Folding
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, person, day, week FROM activities,
  (VALUES
    ('Axel', 0, 1), ('Axel', 1, 1), ('Thomas', 2, 1), ('Thomas', 3, 1), ('Axel', 4, 1), ('Axel', 5, 1), ('Axel', 6, 1),
    ('Ivor', 0, 2), ('Ivor', 1, 2), ('Thomas', 2, 2), ('Thomas', 3, 2), ('Thomas', 4, 2), ('Thomas', 5, 2), ('Thomas', 6, 2),
    ('Ivor', 0, 3), ('Ivor', 1, 3), ('Thomas', 2, 3), ('Thomas', 3, 3), ('Ivor', 4, 3), ('Ivor', 5, 3), ('Ivor', 6, 3),
    ('Axel', 0, 4), ('Axel', 1, 4), ('Thomas', 2, 4), ('Thomas', 3, 4), ('Thomas', 4, 4), ('Thomas', 5, 4), ('Thomas', 6, 4)
  ) AS s(person, day, week)
WHERE activities.name = 'Folding';

-- Laundry (Thomas every day, all weeks)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Thomas', day, week FROM activities,
  (VALUES (0,1),(1,1),(2,1),(3,1),(4,1),(5,1),(6,1),
          (0,2),(1,2),(2,2),(3,2),(4,2),(5,2),(6,2),
          (0,3),(1,3),(2,3),(3,3),(4,3),(5,3),(6,3),
          (0,4),(1,4),(2,4),(3,4),(4,4),(5,4),(6,4)) AS s(day, week)
WHERE activities.name = 'Laundry';

-- Clean upstairs bathroom (Sunday only, rotating)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, person, 6, week FROM activities,
  (VALUES ('Axel', 1), ('Thomas', 2), ('Ivor', 3), ('Thomas', 4)) AS s(person, week)
WHERE activities.name = 'Clean upstairs bathroom';

-- Clean downstairs bathroom (Sunday only, rotating)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, person, 6, week FROM activities,
  (VALUES ('Ivor', 1), ('Thomas', 2), ('Axel', 3), ('Thomas', 4)) AS s(person, week)
WHERE activities.name = 'Clean downstairs bathroom';

-- Vacuum & tidy front room (Sunday only, rotating)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, person, 6, week FROM activities,
  (VALUES ('Axel', 1), ('Thomas', 2), ('Ivor', 3), ('Thomas', 4)) AS s(person, week)
WHERE activities.name = 'Vacuum & tidy front room';

-- Vacuum & tidy dining room (Sunday only, rotating)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, person, 6, week FROM activities,
  (VALUES ('Ivor', 1), ('Thomas', 2), ('Axel', 3), ('Thomas', 4)) AS s(person, week)
WHERE activities.name = 'Vacuum & tidy dining room';

-- Vacuum stairs & landing (Sunday only, rotating)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, person, 6, week FROM activities,
  (VALUES ('Axel', 1), ('Thomas', 2), ('Ivor', 3), ('Thomas', 4)) AS s(person, week)
WHERE activities.name = 'Vacuum stairs & landing';

-- Vacuum own bedroom (Sunday only: Everyone weeks 1&3, Thomas weeks 2&4)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, person, 6, week FROM activities,
  (VALUES ('Everyone', 1), ('Thomas', 2), ('Everyone', 3), ('Thomas', 4)) AS s(person, week)
WHERE activities.name = 'Vacuum own bedroom';

-- Purge fridge & menu (Saturday only, Thomas all weeks)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Thomas', 5, week FROM activities,
  (VALUES (1), (2), (3), (4)) AS s(week)
WHERE activities.name = 'Purge fridge & menu';

-- Grocery shopping (Monday and Saturday, Thomas all weeks)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Thomas', day, week FROM activities,
  (VALUES (0,1),(5,1),(0,2),(5,2),(0,3),(5,3),(0,4),(5,4)) AS s(day, week)
WHERE activities.name = 'Grocery shopping';

-- Deep clean kitchen (Sunday week 1 only, Thomas)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Thomas', 6, 1 FROM activities
WHERE activities.name = 'Deep clean kitchen';

-- Tidy basement (Saturday only, Thomas all weeks)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Thomas', 5, week FROM activities,
  (VALUES (1), (2), (3), (4)) AS s(week)
WHERE activities.name = 'Tidy basement';

-- Change bed sheets - Thomas (Sunday, Thomas all weeks)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Thomas', 6, week FROM activities,
  (VALUES (1), (2), (3), (4)) AS s(week)
WHERE activities.name = 'Change bed sheets - Thomas';

-- Change bed sheets - Boys (Sunday weeks 1 & 3, Thomas)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Thomas', 6, week FROM activities,
  (VALUES (1), (3)) AS s(week)
WHERE activities.name = 'Change bed sheets - Boys';

-- Outside (mow, weed, rake) (Friday week 3 only, Everyone)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Everyone', 4, 3 FROM activities
WHERE activities.name = 'Outside (mow, weed, rake)';

-- D&D (Tuesday all weeks, Ivor)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Ivor', 1, week FROM activities,
  (VALUES (1), (2), (3), (4)) AS s(week)
WHERE activities.name = 'D&D';

-- Science bowl (Thursday all weeks, Ivor)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Ivor', 3, week FROM activities,
  (VALUES (1), (2), (3), (4)) AS s(week)
WHERE activities.name = 'Science bowl';

-- Cello practice (Tue, Wed, Thu all weeks, Ivor)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Ivor', day, week FROM activities,
  (VALUES (1,1),(2,1),(3,1),(1,2),(2,2),(3,2),(1,3),(2,3),(3,3),(1,4),(2,4),(3,4)) AS s(day, week)
WHERE activities.name = 'Cello practice';

-- Cello MYS (Saturday all weeks, Ivor)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Ivor', 5, week FROM activities,
  (VALUES (1), (2), (3), (4)) AS s(week)
WHERE activities.name = 'Cello MYS';

-- Cello lesson (Monday all weeks, Ivor)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Ivor', 0, week FROM activities,
  (VALUES (1), (2), (3), (4)) AS s(week)
WHERE activities.name = 'Cello lesson';

-- Math practice (Monday all weeks, Axel)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Axel', 0, week FROM activities,
  (VALUES (1), (2), (3), (4)) AS s(week)
WHERE activities.name = 'Math practice';

-- Robotics (Tue, Wed all weeks, Axel)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Axel', day, week FROM activities,
  (VALUES (1,1),(2,1),(1,2),(2,2),(1,3),(2,3),(1,4),(2,4)) AS s(day, week)
WHERE activities.name = 'Robotics';

-- Guitar (varies by week, Thomas)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Thomas', day, week FROM activities,
  (VALUES (2,1),(3,1),(5,1), (3,2),(4,2),(6,2), (2,3),(3,3),(5,3), (2,4),(3,4),(5,4)) AS s(day, week)
WHERE activities.name = 'Guitar';

-- Squash (Mon, Wed, Sun all weeks, Thomas)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Thomas', day, week FROM activities,
  (VALUES (0,1),(2,1),(6,1),(0,2),(2,2),(6,2),(0,3),(2,3),(6,3),(0,4),(2,4),(6,4)) AS s(day, week)
WHERE activities.name = 'Squash';

-- Stretches (Every day all weeks, Thomas)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Thomas', day, week FROM activities,
  (VALUES (0,1),(1,1),(2,1),(3,1),(4,1),(5,1),(6,1),
          (0,2),(1,2),(2,2),(3,2),(4,2),(5,2),(6,2),
          (0,3),(1,3),(2,3),(3,3),(4,3),(5,3),(6,3),
          (0,4),(1,4),(2,4),(3,4),(4,4),(5,4),(6,4)) AS s(day, week)
WHERE activities.name = 'Stretches';

-- Family Hike (Sunday weeks 1 & 3, Everyone)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Everyone', 6, week FROM activities,
  (VALUES (1), (3)) AS s(week)
WHERE activities.name = 'Family Hike';

-- Ivor exercise (Wed, Sat all weeks, Ivor)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Ivor', day, week FROM activities,
  (VALUES (2,1),(5,1),(2,2),(5,2),(2,3),(5,3),(2,4),(5,4)) AS s(day, week)
WHERE activities.name = 'Ivor exercise';

-- Axel exercise (Mon, Sat all weeks, Axel)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Axel', day, week FROM activities,
  (VALUES (0,1),(5,1),(0,2),(5,2),(0,3),(5,3),(0,4),(5,4)) AS s(day, week)
WHERE activities.name = 'Axel exercise';

-- Video Downtime (varies, Everyone)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Everyone', day, week FROM activities,
  (VALUES (0,1),(1,1),(4,1),(5,1),(6,1),
          (0,2),(1,2),
          (0,3),(1,3),(4,3),(5,3),(6,3),
          (0,4),(1,4)) AS s(day, week)
WHERE activities.name = 'Video Downtime';

-- Family Video / Read (varies, Everyone)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Everyone', day, week FROM activities,
  (VALUES (0,1),(1,1),(4,1),(5,1),(6,1),
          (0,2),(1,2),
          (0,3),(1,3),(4,3),(5,3),(6,3),
          (0,4),(1,4)) AS s(day, week)
WHERE activities.name = 'Family Video / Read';

-- Non video downtime (varies, Everyone)
INSERT INTO schedule (activity_id, person, day_of_week, week_of_cycle)
SELECT id, 'Everyone', day, week FROM activities,
  (VALUES (0,1),(1,1),(4,1),(5,1),(6,1),
          (0,2),(1,2),
          (0,3),(1,3),(4,3),(5,3),(6,3),
          (0,4),(1,4)) AS s(day, week)
WHERE activities.name = 'Non video downtime';
