export default function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="bg-white border border-[#e6e8e9] rounded-md p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#667382] uppercase tracking-wider">{title}</h3>
        {Icon && <Icon stroke={1.5} className="h-5 w-5 text-[#206bc4]" />}
      </div>
      <div className="text-3xl font-bold text-[#182433] mb-1">{value}</div>
      <p className="text-sm text-[#20a790] font-medium">{subtitle}</p>
    </div>
  );
}