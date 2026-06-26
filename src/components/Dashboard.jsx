import { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Activity, Package } from 'lucide-react';
import StatCard from './StatCard';
import OverviewChart from './OverviewChart';

export default function Dashboard() {
  const [stats, setStats] = useState({
    revenue: 0,
    salesCount: 0,
    recentSales: [],
    chartData: []
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <button onClick={loadStats} className="bg-amber-500 text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-amber-400 transition-colors">
            Refresh Data
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Revenue" value={`$${stats.revenue.toFixed(2)}`} subtitle="All-time earnings" icon={DollarSign} />
        <StatCard title="Total Orders" value={stats.salesCount.toString()} subtitle="Processed transactions" icon={CreditCard} />
        <StatCard title="System Status" value="Online" subtitle="Local Database Connected" icon={Activity} />
        <StatCard title="Recent Activity" value={stats.recentSales.length.toString()} subtitle="Latest transactions recorded" icon={Package} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 col-span-4 shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-lg text-white">Revenue Overview</h3>
          </div>
          <OverviewChart data={stats.chartData.length > 0 ? stats.chartData : [{ name: 'No Data', total: 0 }]} />
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 col-span-3 shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-lg text-white">Recent Orders</h3>
            <p className="text-sm text-zinc-500">Latest successful transactions.</p>
          </div>
          <div className="space-y-8">
            {stats.recentSales.length === 0 ? (
              <p className="text-sm text-zinc-500">No recent sales.</p>
            ) : (
              stats.recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center">
                  <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium text-white">
                    OD
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none text-white">Order #{sale.id}</p>
                    <p className="text-xs text-zinc-500">{new Date(sale.date).toLocaleString()}</p>
                  </div>
                  <div className="ml-auto font-medium text-amber-500">+${sale.total.toFixed(2)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}