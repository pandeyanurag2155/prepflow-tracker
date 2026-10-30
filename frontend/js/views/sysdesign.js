import { levelledView } from './revision.js';

// No months or deadlines: study it at your own pace
export const renderSysdesign = () => levelledView('sysdesign', 'System design',
  'HLD (distributed systems) and LLD (object-oriented design and concurrency), at your own pace. “Design: …” topics are practice problems; ↗ opens a reading. Click a track to open it.',
  { scheduled: false });
