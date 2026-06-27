import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function OverviewChart({ data, theme }) {
  const isDark = theme === 'dark';
  const textColor = isDark ? '#a0a0a0' : '#667382';
  const gridColor = isDark ? '#333333' : '#e6e8e9';
  const chartColor = isDark ? '#ffb300' : '#206bc4';
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColor} stopOpacity={isDark ? 0.4 : 0.2}/>
            <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 12, fontWeight: 500 }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 12, fontWeight: 500 }} />
        <Tooltip
          contentStyle={{ 
            backgroundColor: isDark ? '#1e1e1e' : '#ffffff', 
            borderColor: isDark ? '#333333' : '#e6e8e9', 
            color: isDark ? '#ffffff' : '#182433', 
            borderRadius: '6px', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          itemStyle={{ color: chartColor, fontWeight: 'bold' }}
        />
        <Area type="monotone" dataKey="total" stroke={chartColor} strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" activeDot={{ r: 6, strokeWidth: 0, fill: chartColor }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}