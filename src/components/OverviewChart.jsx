import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis } from 'recharts';

const data = [
  { name: 'Jan', total: 4200 },
  { name: 'Feb', total: 3400 },
  { name: 'Mar', total: 4600 },
  { name: 'Apr', total: 3100 },
  { name: 'May', total: 1600 },
  { name: 'Jun', total: 3800 },
  { name: 'Jul', total: 4100 },
  { name: 'Aug', total: 4400 },
  { name: 'Sep', total: 2000 },
  { name: 'Oct', total: 3400 },
  { name: 'Nov', total: 5000 },
  { name: 'Dec', total: 4800 },
];

export default function OverviewChart({ data }) {
  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
          <Bar dataKey="total" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}