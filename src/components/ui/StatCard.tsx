export default function StatCard({
  label,
  value,
  accent = 'blue',
}: {
  label: string;
  value: string | number;
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'gray';
}) {
  const colors: Record<string, string> = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    gray: 'text-gray-700',
  };
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className={`text-3xl font-extrabold ${colors[accent]}`}>{value}</div>
      <p className="mt-1 text-sm text-gray-600">{label}</p>
    </div>
  );
}
