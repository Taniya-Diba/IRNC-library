import './StatCard.css';

export default function StatCard({ label, value, icon, color = 'blue', sub }) {
  return (
    <div className={`stat-card stat-card--${color}`}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-body">
        <span className="stat-card-value">{value ?? '—'}</span>
        <span className="stat-card-label">{label}</span>
        {sub && <span className="stat-card-sub">{sub}</span>}
      </div>
    </div>
  );
}
