import { useState, useEffect } from 'react';
import { IconCurrencyDollar, IconCreditCard, IconActivity, IconPackage, IconAlertTriangle, IconCheck, IconCalendarEvent } from '@tabler/icons-react';
import StatCard from './StatCard';
import OverviewChart from './OverviewChart';

export default function Dashboard() {
  const [dateRange, setDateRange] = useState('all'); // 'all', 'today', '7days', '30days'
  const [stats, setStats] = useState({ revenue: 0, salesCount: 0, recentSales: [], chartData: [], lowStock: [] });

  useEffect(() => { 
    loadStats(); 
  }, [dateRange]); // Reloads stats whenever dateRange changes!

  const loadStats = async () => {
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.getDashboardStats(dateRange);
        setStats(data);
      } catch (error) { console.error(error); }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header & Date Filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#182433]">Dashboard Overview</h2>
        
        {/* Tabler Segmented Control for Dates */}
        <div className="inline-flex bg-[#e6e8e9] rounded-md p-1 shadow-sm">
          {[
            { id: 'all', label: 'All-Time' },
            { id: 'today', label: 'Today' },
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setDateRange(tab.id)}
              className={`flex items-center px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                dateRange === tab.id ? 'bg-white text-[#182433] shadow-sm' : 'text-[#667382] hover:text-[#182433]'
              }`}
            >
              {tab.id === 'today' && <IconCalendarEvent size={16} stroke={1.5} className="mr-1.5" />}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Revenue" value={`$${stats.revenue.toFixed(2)}`} subtitle="For selected period" icon={IconCurrencyDollar} />
        <StatCard title="Orders Processed" value={stats.salesCount.toString()} subtitle="For selected period" icon={IconCreditCard} />
        <StatCard title="System Status" value="Online" subtitle="Local Database Connected" icon={IconActivity} />
        <StatCard title="Recent Activity" value={stats.recentSales.length.toString()} subtitle="Latest transactions" icon={IconPackage} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Chart Section (12-Month Macro Overview) */}
        <div className="bg-white border border-[#e6e8e9] rounded-md p-5 shadow-sm lg:col-span-2 flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-[#182433]">12-Month Revenue Overview</h3>
          </div>
          <div className="flex-1 min-h-[300px]">
            <OverviewChart data={stats.chartData.length > 0 ? stats.chartData : [{ name: 'No Data', total: 0 }]} />
          </div>
        </div>

        {/* Recent Orders Section */}
        <div className="bg-white border border-[#e6e8e9] rounded-md shadow-sm flex flex-col">
          <div className="p-5 border-b border-[#e6e8e9]">
            <h3 className="font-bold text-[#182433]">Recent Orders</h3>
          </div>
          <div className="p-0">
            {stats.recentSales.length === 0 ? (
              <p className="p-5 text-sm text-[#667382] text-center">No sales in this period.</p>
            ) : (
              <div className="divide-y divide-[#e6e8e9]">
                {stats.recentSales.map((sale) => (
                  <div key={sale.id} className="p-4 flex items-center hover:bg-[#f8f9fa] transition-colors">
                    <div className="h-10 w-10 rounded-full bg-[#e6f0fa] flex items-center justify-center text-[#206bc4] font-bold text-sm mr-4">
                      OD
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#182433]">Order #{sale.id}</p>
                      <p className="text-[11px] text-[#667382] mt-0.5">{new Date(sale.date).toLocaleDateString()}</p>
                    </div>
                    <div className="font-bold text-[#182433]">${sale.total.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* NEW: Low Stock Alerts Widget */}
        <div className="bg-white border border-[#e6e8e9] rounded-md shadow-sm flex flex-col lg:col-span-3">
          <div className="p-5 border-b border-[#e6e8e9]">
            <h3 className="font-bold text-[#182433] flex items-center">
              <IconAlertTriangle className="mr-2 text-[#f59f00]" size={20} stroke={2} />
              Inventory Action Required (10 or fewer items)
            </h3>
          </div>
          <div className="p-0 overflow-x-auto">
            {stats.lowStock.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-[#667382]">
                <div className="bg-[#2ba02b]/10 p-4 rounded-full mb-3">
                  <IconCheck size={32} stroke={2} className="text-[#2ba02b]" />
                </div>
                <p className="font-medium text-[#182433]">All products are adequately stocked.</p>
                <p className="text-sm mt-1">No immediate reordering required.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f8f9fa] text-[11px] uppercase tracking-wider text-[#667382] font-bold border-b border-[#e6e8e9]">
                  <tr>
                    <th className="px-5 py-3 w-10"></th>
                    <th className="px-5 py-3">Product Name</th>
                    <th className="px-5 py-3">SKU</th>
                    <th className="px-5 py-3 text-right">Current Stock</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6e8e9] text-[#182433]">
                  {stats.lowStock.map(product => {
                    const isOutOfStock = product.stock === 0;
                    return (
                      <tr key={product.id} className="hover:bg-[#f8f9fa] transition-colors">
                        <td className="px-5 py-3">
                          {product.image ? (
                            <img src={product.image} className="h-8 w-8 rounded border border-[#e6e8e9] object-cover" alt="" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-[#f4f6fa] border border-[#e6e8e9] flex items-center justify-center text-[#667382]">
                              <IconPackage size={16} stroke={1.5} />
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 font-semibold">{product.name}</td>
                        <td className="px-5 py-3 text-[#667382] text-xs">{product.sku}</td>
                        <td className="px-5 py-3 text-right font-bold text-lg">{product.stock}</td>
                        <td className="px-5 py-3">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#d63939]/10 text-[#d63939]">
                              Out of Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#f59f00]/10 text-[#f59f00]">
                              Low Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}