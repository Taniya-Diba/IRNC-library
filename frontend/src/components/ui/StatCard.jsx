import './StatCard.css';

const COLOR_MAP = {
  blue:   { text: '#1d4ed8', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.22)' },
  green:  { text: '#15803d', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.22)'  },
  amber:  { text: '#92400e', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.22)' },
  red:    { text: '#991b1b', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.22)'  },
  purple: { text: '#5b21b6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.22)' },
};

export default function StatCard({ label, value, color = 'blue' }) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;
  return (
    <div className="stat-card glass" style={{ borderColor: c.border }}>
      <p className="stat-label">{label}</p>
      <p className="stat-value" style={{ color: c.text }}>{value ?? '—'}</p>
    </div>
  );
}
