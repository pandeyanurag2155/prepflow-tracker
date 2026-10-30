-- New section: core CS subjects (OOPs, DBMS, OS, CN) as subject → chapter → topics.
ALTER TABLE plan_groups DROP CONSTRAINT plan_groups_section_id_check,
  ADD CONSTRAINT plan_groups_section_id_check CHECK (section_id IN ('roadmap', 'dsa', 'striver', 'revision', 'sysdesign', 'tools', 'core'));
ALTER TABLE plan_items DROP CONSTRAINT plan_items_section_id_check,
  ADD CONSTRAINT plan_items_section_id_check CHECK (section_id IN ('roadmap', 'dsa', 'striver', 'revision', 'sysdesign', 'tools', 'core'));
