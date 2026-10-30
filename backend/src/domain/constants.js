export const SCHEMA_VERSION = 2;

export const SECTIONS = Object.freeze([
  { id: 'roadmap', title: 'Roadmap' },
  { id: 'dsa', title: 'DSA plan' },
  { id: 'striver', title: 'Striver A2Z' },
  { id: 'revision', title: 'Topic revision' },
  { id: 'sysdesign', title: 'System design' },
  { id: 'tools', title: 'Backend tools' },
  { id: 'core', title: 'Core subjects' },
]);
export const SECTION_IDS = SECTIONS.map(s => s.id);
export const KINDS = ['task', 'concept', 'problem', 'topic'];
export const TRACKS = ['DSA', 'System design', 'Deep dive', 'Behavioral', 'Applications', 'Checkpoint'];
export const LEVELS = ['Basic', 'Intermediate', 'Advanced'];
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
/** Sections whose groups nest one level deep (Striver step → sub-step, core subject → chapter). */
export const NESTED_SECTIONS = ['striver', 'core'];
export const THEMES = ['system', 'light', 'dark'];

/** Days after completion when a problem comes back for revisit. */
export const REVISIT_AFTER_DAYS = [3, 7];

export const DEFAULT_SETTINGS = Object.freeze({
  planStart: '2026-10-26',
  planMonths: 3,
  theme: 'system',
  linkDuplicates: true,
  hideCompleted: false,
});
