export default function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <h3 className="tracking-tight text-sm font-medium text-zinc-100">{title}</h3>
        {Icon && <Icon className="h-4 w-4 text-zinc-500" />}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>
    </div>
  );
}