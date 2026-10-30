-- New section: system design (HLD and LLD tracks, each with Basic / Intermediate / Advanced topics).
ALTER TABLE plan_groups DROP CONSTRAINT plan_groups_section_id_check,
  ADD CONSTRAINT plan_groups_section_id_check CHECK (section_id IN ('roadmap', 'dsa', 'striver', 'revision', 'sysdesign'));
ALTER TABLE plan_items DROP CONSTRAINT plan_items_section_id_check,
  ADD CONSTRAINT plan_items_section_id_check CHECK (section_id IN ('roadmap', 'dsa', 'striver', 'revision', 'sysdesign'));
