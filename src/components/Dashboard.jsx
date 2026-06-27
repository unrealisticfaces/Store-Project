import { useState, useEffect } from 'react';
import { IconCurrencyDollar, IconCreditCard, IconActivity, IconPackage, IconAlertTriangle, IconCheck, IconCalendarEvent, IconTrophy, IconWallet, IconServer } from '@tabler/icons-react';
import OverviewChart from './OverviewChart';

export default function Dashboard({ theme }) {
  const [dateRange, setDateRange] = useState('all'); 
  const [stats, setStats] = useState({ revenue: 0, salesCount: 0, recentSales: [], chartData: [], lowStock: [], topProducts: [], totalCredit: 0, dbSize: 0 });

  const isDark = theme === 'dark';

  useEffect(() => { loadStats(); }, [dateRange]);

  const loadStats = async () => {
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.getDashboardStats(dateRange);
        setStats(data);
      } catch (error) { console.error(error); }
    }
  };

  const StatWidget = ({ title, value, subtitle, icon: Icon, colorClass }) => (
    <div className={`p-5 rounded-md shadow-sm border flex items-center space-x-4 ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
      <div className={`p-3 rounded-md ${colorClass}`}>
        <Icon size={24} stroke={1.5} />
      </div>
      <div>
        <p className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>{title}</p>
        <h3 className={`text-2xl font-bold leading-none ${isDark ? 'text-white' : 'text-[#182433]'}`}>{value}</h3>
        {subtitle && <p className={`text-[11px] mt-1 font-medium ${isDark ? 'text-[#a0a0a0]' : 'text-[#a0aab5]'}`}>{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header & Date Filters */}
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#182433]'}`}>Dashboard Overview</h2>
        
        <div className={`inline-flex rounded-md p-1 shadow-sm ${isDark ? 'bg-[#1a1a1a] border border-[#333333]' : 'bg-[#e6e8e9]'}`}>
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
                dateRange === tab.id 
                  ? (isDark ? 'bg-[#252525] text-[#ffb300] shadow-sm' : 'bg-white text-[#182433] shadow-sm') 
                  : (isDark ? 'text-[#a0a0a0] hover:text-[#ffffff]' : 'text-[#667382] hover:text-[#182433]')
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
        <StatWidget title="Revenue" value={`$${stats.revenue.toFixed(2)}`} subtitle="For selected period" icon={IconCurrencyDollar} colorClass={isDark ? 'bg-[#2ba02b]/20 text-[#2ba02b]' : 'bg-[#2ba02b]/10 text-[#2ba02b]'} />
        <StatWidget title="Orders Processed" value={stats.salesCount.toString()} subtitle="For selected period" icon={IconCreditCard} colorClass={isDark ? 'bg-[#206bc4]/20 text-[#206bc4]' : 'bg-[#206bc4]/10 text-[#206bc4]'} />
        <StatWidget title="Total Store Credit" value={`$${stats.totalCredit.toFixed(2)}`} subtitle="Active customer balances" icon={IconWallet} colorClass={isDark ? 'bg-[#ffb300]/20 text-[#ffb300]' : 'bg-[#f59f00]/10 text-[#f59f00]'} />
        <StatWidget title="System Health" value="Online" subtitle="Local storage connected" icon={IconActivity} colorClass={isDark ? 'bg-[#6f42c1]/20 text-[#6f42c1]' : 'bg-[#6f42c1]/10 text-[#6f42c1]'} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Macro Chart */}
        <div className={`col-span-2 rounded-md p-5 shadow-sm border flex flex-col ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
          <div className="mb-4">
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-[#182433]'}`}>12-Month Revenue Overview</h3>
          </div>
          <div className="flex-1 min-h-[300px]">
            <OverviewChart data={stats.chartData.length > 0 ? stats.chartData : [{ name: 'No Data', total: 0 }]} theme={theme} />
          </div>
        </div>

        {/* Top Selling Products */}
        <div className={`rounded-md shadow-sm border flex flex-col ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
          <div className={`p-5 border-b flex items-center ${isDark ? 'border-[#333333]' : 'border-[#e6e8e9]'}`}>
            <IconTrophy className={`mr-2 ${isDark ? 'text-[#ffb300]' : 'text-[#f59f00]'}`} size={20} stroke={2} />
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-[#182433]'}`}>Top Sellers</h3>
          </div>
          <div className="p-5 flex-1 flex flex-col justify-center space-y-4">
            {stats.topProducts.length === 0 ? (
              <p className={`text-sm text-center ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>No sales data in this period.</p>
            ) : (
              stats.topProducts.map((p, i) => (
                <div key={i} className="flex justify-between items-center">
                   <div className="flex items-center">
                      <div className={`h-8 w-8 rounded flex items-center justify-center font-bold text-xs mr-3 ${i===0 ? (isDark ? 'bg-[#ffb300]/20 text-[#ffb300]' : 'bg-[#f59f00]/20 text-[#f59f00]') : (isDark ? 'bg-[#252525] text-[#a0a0a0]' : 'bg-[#f4f6fa] text-[#667382]')}`}>
                        #{i+1}
                      </div>
                      <span className={`text-sm font-semibold line-clamp-1 max-w-[120px] ${isDark ? 'text-[#e0e0e0]' : 'text-[#182433]'}`}>{p.product_name}</span>
                   </div>
                   <span className={`text-xs font-bold px-2 py-1 rounded ${isDark ? 'bg-[#252525] text-[#ffb300]' : 'bg-[#e6f0fa] text-[#206bc4]'}`}>
                     {p.sold} sold
                   </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className={`col-span-2 rounded-md shadow-sm border flex flex-col ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
          <div className={`p-5 border-b flex items-center ${isDark ? 'border-[#333333]' : 'border-[#e6e8e9]'}`}>
            <IconAlertTriangle className="mr-2 text-[#f59f00]" size={20} stroke={2} />
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-[#182433]'}`}>Inventory Action Required (10 or fewer items)</h3>
          </div>
          <div className="p-0 overflow-x-auto h-full">
            {stats.lowStock.length === 0 ? (
              <div className={`h-full flex flex-col items-center justify-center py-8 ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>
                <div className="bg-[#2ba02b]/10 p-4 rounded-full mb-3">
                  <IconCheck size={32} stroke={2} className="text-[#2ba02b]" />
                </div>
                <p className={`font-medium ${isDark ? 'text-[#e0e0e0]' : 'text-[#182433]'}`}>All products adequately stocked.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className={`text-[11px] uppercase tracking-wider font-bold border-b ${isDark ? 'bg-[#121212] text-[#a0a0a0] border-[#333333]' : 'bg-[#f8f9fa] text-[#667382] border-[#e6e8e9]'}`}>
                  <tr>
                    <th className="px-5 py-3 w-10">Img</th>
                    <th className="px-5 py-3">Product Name</th>
                    <th className="px-5 py-3 text-right">Current Stock</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-[#333333] text-[#e0e0e0]' : 'divide-[#e6e8e9] text-[#182433]'}`}>
                  {stats.lowStock.map(product => (
                    <tr key={product.id} className={`transition-colors ${isDark ? 'hover:bg-[#252525]' : 'hover:bg-[#f8f9fa]'}`}>
                      <td className="px-5 py-3">
                        {product.image ? (
                          <img src={product.image} className={`h-8 w-8 rounded border object-cover ${isDark ? 'border-[#333333]' : 'border-[#e6e8e9]'}`} alt="" />
                        ) : (
                          <div className={`h-8 w-8 rounded border flex items-center justify-center ${isDark ? 'bg-[#121212] border-[#333333] text-[#7a7a7a]' : 'bg-[#f4f6fa] border-[#e6e8e9] text-[#667382]'}`}>
                            <IconPackage size={16} stroke={1.5} />
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 font-semibold">{product.name}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${product.stock === 0 ? 'bg-[#d63939]/10 text-[#d63939]' : 'bg-[#f59f00]/10 text-[#f59f00]'}`}>
                          {product.stock === 0 ? 'Out of Stock' : `${product.stock} Left`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Tabler Uptime Tracker */}
        <div className={`rounded-md shadow-sm border flex flex-col p-5 ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
          <div className="flex justify-between items-center mb-4">
             <h3 className={`font-bold flex items-center ${isDark ? 'text-white' : 'text-[#182433]'}`}>
               <IconServer size={20} className={`mr-2 ${isDark ? 'text-[#ffb300]' : 'text-[#667382]'}`} />
               Database Health
             </h3>
             <span className="text-xs text-[#2ba02b] font-bold bg-[#2ba02b]/10 px-2 py-0.5 rounded">99.9% Uptime</span>
          </div>
          <div className="flex items-end space-x-[2px] h-12 mt-2">
             {[...Array(40)].map((_, i) => {
                let bg = 'bg-[#2ba02b]';
                let height = 'h-full';
                let opacity = isDark ? 'opacity-80' : 'opacity-100';
                
                if (i === 15) { bg = 'bg-[#f59f00]'; height = 'h-3/4'; opacity = 'opacity-100'; }
                if (i === 28) { bg = 'bg-[#d63939]'; height = 'h-1/2'; opacity = 'opacity-100'; }

                return <div key={i} className={`flex-1 rounded-sm ${bg} ${height} ${opacity} hover:opacity-100 transition-opacity cursor-help`} title={`Day ${i+1}`}></div>
             })}
          </div>
          <div className={`flex justify-between items-center text-xs mt-4 ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>
            <span>Local SQLite Node</span>
            <span className="font-semibold">{stats.dbSize} MB Total Size</span>
          </div>
        </div>

      </div>
    </div>
  );
}