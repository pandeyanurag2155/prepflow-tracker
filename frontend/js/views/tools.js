import { levelledView } from './revision.js';

// Reading list per tool, at your own pace (no months)
export const renderTools = () => levelledView('tools', 'Backend tools',
  'Redis, Kafka, RabbitMQ and gRPC, at your own pace. ↗ opens the official docs for each topic. Click a tool to open it.',
  { scheduled: false });
