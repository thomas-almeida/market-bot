export default function MetricCard({ title, value, color = 'blue' }) {
  const colors = {
    blue: 'from-blue-600 to-blue-700',
    green: 'from-emerald-600 to-emerald-700',
    yellow: 'from-amber-600 to-amber-700',
    purple: 'from-purple-600 to-purple-700',
    red: 'from-red-600 to-red-700',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color] || colors.blue} rounded-lg p-5 shadow-lg`}>
      <p className="text-sm text-blue-100">{title}</p>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}
