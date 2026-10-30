-- Switch from a week-based schedule to a month-based plan (default 3 months).
-- Roadmap and NeetCode themes carry the month they belong to; Striver is self-paced (no schedule).

ALTER TABLE plan_groups RENAME COLUMN week TO month;

-- Old week numbers → months of a 3-month plan (weeks 1–3 → 1, 4–6 → 2, 7+ → 3; 0 stays “before you start”).
UPDATE plan_groups SET month = CASE WHEN month = 0 THEN 0 WHEN month <= 3 THEN 1 WHEN month <= 6 THEN 2 ELSE 3 END
WHERE section_id IN ('roadmap', 'dsa') AND month IS NOT NULL;
UPDATE plan_groups SET month = NULL WHERE section_id IN ('striver', 'revision');

ALTER TABLE settings RENAME COLUMN roadmap_start TO plan_start;
ALTER TABLE settings DROP COLUMN striver_start, DROP COLUMN striver_weeks;
ALTER TABLE settings ADD COLUMN plan_months smallint NOT NULL DEFAULT 3 CHECK (plan_months BETWEEN 1 AND 12);
