// One badge for severities, log levels and alert statuses; the value picks the tone.
const TONE = {
  LOW: 'calm', MEDIUM: 'watch', HIGH: 'hot', CRITICAL: 'crit',
  DEBUG: 'calm', INFO: 'calm', WARN: 'watch', ERROR: 'hot',
  OPEN: 'hot', ACKNOWLEDGED: 'watch', RESOLVED: 'calm',
  ADMIN: 'ink', VIEWER: 'calm',
};

const LABEL = { ACKNOWLEDGED: 'Acknowledged', OPEN: 'Open', RESOLVED: 'Resolved' };

export default function Badge({ value }) {
  if (!value) return <span className="muted">—</span>;
  const text = LABEL[value] || value.charAt(0) + value.slice(1).toLowerCase();
  return <span className={`badge tone-${TONE[value] || 'calm'}`}>{text}</span>;
}
