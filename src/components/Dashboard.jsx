import { useState, useEffect, useMemo } from 'react';
import { IconCurrencyDollar, IconCreditCard, IconActivity, IconTrophy, IconWallet, IconChartDonut, IconAlertTriangle, IconCheck, IconChartBar, IconTrendingUp, IconUsers } from '@tabler/icons-react';
import Chart from 'react-apexcharts';

export default function Dashboard({ theme }) {
  const [stats, setStats] = useState({ revenue: 0, salesCount: 0, chart7Days: [], chart30Days: [], categoryData: [], topProducts: [], cashierData: [], totalCredit: 0, lowStock: [] });
  const [settings, setSettings] = useState({ currency: 'PHP' });
  const isDark = theme === 'dark';

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    if (window.electronAPI) {
      try {
        setStats(await window.electronAPI.getDashboardStats());
        const sData = await window.electronAPI.getSettings();
        const sObj = {};
        sData.forEach(item => sObj[item.key] = item.value);
        setSettings(sObj);
      } catch (error) {}
    }
  };

  const currencySymbol = { USD: '$', EUR: '€', GBP: '£', PHP: '₱' }[settings.currency] || '₱';

  const getDayName = (dateString) => {
    const d = new Date(dateString + 'T12:00:00');
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  };

  const getTimestamp = (dateString) => new Date(dateString + 'T12:00:00').getTime();

  const display7Days = useMemo(() => {
    if (!stats.chart7Days || stats.chart7Days.length === 0) return [];
    return [...stats.chart7Days].sort((a, b) => {
      const dayA = new Date(a.date + 'T12:00:00').getDay() || 7;
      const dayB = new Date(b.date + 'T12:00:00').getDay() || 7;
      return dayA - dayB;
    });
  }, [stats.chart7Days]);

  const mappedCashierSeries = useMemo(() => {
    if (!stats.cashierData || stats.chart7Days.length === 0) return [];
    const sortIndices = stats.chart7Days.map((d, index) => {
        const day = new Date(d.date + 'T12:00:00').getDay() || 7;
        return { originalIndex: index, day };
    }).sort((a, b) => a.day - b.day);

    return stats.cashierData.map(c => {
      const reorderedSeries = sortIndices.map(info => c.series[info.originalIndex]);
      return { name: c.name, data: reorderedSeries };
    });
  }, [stats.cashierData, stats.chart7Days]);

  const PanelHeader = ({ title, icon: Icon }) => (
    <div className={`p-4 border-b flex items-center ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
      {Icon && <Icon className={`mr-2 ${isDark ? 'text-[#ffb300]' : 'text-[#206bc4]'}`} size={18} stroke={2} />}
      <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#182433]'}`}>{title}</h3>
    </div>
  );

  const StatWidget = ({ title, value, icon: Icon, colorClass }) => (
    <div className={`p-4 rounded-md shadow-sm border flex items-center space-x-3 ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
      <div className={`p-2 rounded-md ${colorClass}`}>
        <Icon size={18} stroke={2} />
      </div>
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>{title}</p>
        <h3 className={`text-lg font-bold leading-none ${isDark ? 'text-white' : 'text-[#182433]'}`}>{value}</h3>
      </div>
    </div>
  );

  const barOptions = {
    chart: { type: 'bar', fontFamily: 'inherit', toolbar: { show: false }, background: 'transparent' },
    colors: [isDark ? '#ffb300' : '#206bc4'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '40%' } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: display7Days.map(d => getDayName(d.date)),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: isDark ? '#a0a0a0' : '#667382', fontSize: '11px', fontWeight: 500 } }
    },
    yaxis: { labels: { style: { colors: isDark ? '#a0a0a0' : '#667382', fontSize: '11px' }, formatter: (val) => `${currencySymbol}${val}` } },
    grid: { borderColor: isDark ? '#333333' : '#e6e8e9', strokeDashArray: 3, xaxis: { lines: { show: false } } },
    theme: { mode: isDark ? 'dark' : 'light' },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      x: { formatter: (val, opts) => {
          const idx = opts.dataPointIndex;
          if (display7Days[idx]) return new Date(display7Days[idx].date + 'T12:00:00').toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
          return val;
      }},
      y: { formatter: (val) => `${currencySymbol}${val.toFixed(2)}` }
    }
  };

  const area30Options = {
    chart: { type: 'area', fontFamily: 'inherit', toolbar: { show: false }, background: 'transparent' },
    colors: [isDark ? '#ffb300' : '#206bc4'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: isDark ? 0.4 : 0.1, opacityTo: 0, stops: [0, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { type: 'datetime', labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: false } },
    yaxis: { show: false },
    grid: { show: false, padding: { top: 0, bottom: 0, left: 0, right: 0 } },
    theme: { mode: isDark ? 'dark' : 'light' },
    tooltip: { theme: isDark ? 'dark' : 'light', x: { format: 'MMM dd, yyyy' }, y: { formatter: (val) => `${currencySymbol}${val.toFixed(2)}` } }
  };

  const multiLineOptions = {
    chart: { type: 'line', fontFamily: 'inherit', toolbar: { show: false }, background: 'transparent' },
    colors: ['#206bc4', '#2ba02b', '#ffb300', '#d63939', '#6f42c1', '#f59f00', '#17a2b8', '#fd7e14'],
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      categories: display7Days.map(d => getDayName(d.date)),
      labels: { style: { colors: isDark ? '#a0a0a0' : '#667382', fontSize: '11px', fontWeight: 500 } },
      axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: false }
    },
    yaxis: { labels: { style: { colors: isDark ? '#a0a0a0' : '#667382', fontSize: '11px' }, formatter: (val) => `${currencySymbol}${val}` } },
    grid: { borderColor: isDark ? '#333333' : '#e6e8e9', strokeDashArray: 3, xaxis: { lines: { show: false } } },
    theme: { mode: isDark ? 'dark' : 'light' },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      shared: true,
      intersect: false,
      x: { formatter: (val, opts) => {
          const idx = opts.dataPointIndex;
          if (display7Days[idx]) return new Date(display7Days[idx].date + 'T12:00:00').toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
          return val;
      }},
      y: { formatter: (val) => `${currencySymbol}${val.toFixed(2)}` }
    },
    legend: { position: 'top', horizontalAlign: 'right', labels: { colors: isDark ? '#a0a0a0' : '#667382' } }
  };

  const categoryOptions = {
    chart: { type: 'donut', background: 'transparent' },
    labels: stats.categoryData ? stats.categoryData.map(c => c.name || 'Uncategorized') : [],
    theme: { mode: isDark ? 'dark' : 'light' }, stroke: { show: false }, dataLabels: { enabled: false },
    legend: { position: 'bottom', labels: { colors: isDark ? '#a0a0a0' : '#667382' } }
  };
  const categorySeries = stats.categoryData ? stats.categoryData.map(c => c.total) : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#182433]'}`}>Dashboard Overview</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatWidget title="Net Revenue" value={`${currencySymbol}${stats.revenue.toFixed(2)}`} icon={IconCurrencyDollar} colorClass={isDark ? 'bg-[#2ba02b]/20 text-[#2ba02b]' : 'bg-[#2ba02b]/10 text-[#2ba02b]'} />
        <StatWidget title="Total Invoices" value={stats.salesCount.toString()} icon={IconCreditCard} colorClass={isDark ? 'bg-[#206bc4]/20 text-[#206bc4]' : 'bg-[#206bc4]/10 text-[#206bc4]'} />
        <StatWidget title="Store Credit" value={`${currencySymbol}${stats.totalCredit.toFixed(2)}`} icon={IconWallet} colorClass={isDark ? 'bg-[#ffb300]/20 text-[#ffb300]' : 'bg-[#f59f00]/10 text-[#f59f00]'} />
        <StatWidget title="System Node" value="Online" icon={IconActivity} colorClass={isDark ? 'bg-[#6f42c1]/20 text-[#6f42c1]' : 'bg-[#6f42c1]/10 text-[#6f42c1]'} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className={`rounded-md shadow-sm border flex flex-col ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
          <PanelHeader title="7-Day Revenue Trend" icon={IconChartBar} />
          <div className="flex-1 min-h-[220px] p-4">
            <Chart options={barOptions} series={[{ name: 'Revenue', data: display7Days.map(d => d.total) }]} type="bar" height="100%" />
          </div>
        </div>

        <div className={`rounded-md shadow-sm border flex flex-col overflow-hidden ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
          <PanelHeader title="30-Day Activity Overview" icon={IconTrendingUp} />
          <div className="flex-1 w-full min-h-[220px] translate-y-3">
            <Chart options={area30Options} series={[{ name: 'Revenue', data: stats.chart30Days.map(d => [getTimestamp(d.date), d.total]) }]} type="area" height="100%" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className={`col-span-2 rounded-md shadow-sm border flex flex-col ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
          <PanelHeader title="Cashier Performance" icon={IconUsers} />
          <div className="p-4 flex-1 min-h-[250px]">
            {stats.cashierData.length === 0 ? (
                <p className={`text-sm text-center py-8 ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>No staff sales recorded.</p>
            ) : (
                <Chart options={multiLineOptions} series={mappedCashierSeries} type="line" height="100%" />
            )}
          </div>
        </div>

        <div className={`rounded-md shadow-sm border flex flex-col ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
          <PanelHeader title="Category Share" icon={IconChartDonut} />
          <div className="p-4 flex-1 flex flex-col justify-center items-center">
            {categorySeries.length === 0 ? <p className={`text-sm text-center py-8 ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>No data available.</p> : <Chart options={categoryOptions} series={categorySeries} type="donut" width="100%" />}
          </div>
        </div>

        <div className={`rounded-md shadow-sm border flex flex-col ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
          <PanelHeader title="Top Sellers" icon={IconTrophy} />
          <div className="p-4 flex-1 flex flex-col justify-center space-y-4">
            {stats.topProducts.length === 0 ? <p className={`text-sm text-center py-8 ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>No sales data.</p> : stats.topProducts.map((p, i) => (
              <div key={i} className="flex justify-between items-center">
                 <div className="flex items-center">
                    <div className={`h-6 w-6 rounded flex items-center justify-center font-bold text-xs mr-3 ${i===0 ? (isDark ? 'bg-[#ffb300]/20 text-[#ffb300]' : 'bg-[#f59f00]/20 text-[#f59f00]') : (isDark ? 'bg-[#252525] text-[#a0a0a0]' : 'bg-[#f4f6fa] text-[#667382]')}`}>#{i+1}</div>
                    <span className={`text-sm font-medium line-clamp-1 max-w-[140px] ${isDark ? 'text-[#e0e0e0]' : 'text-[#182433]'}`}>{p.product_name}</span>
                 </div>
                 <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isDark ? 'bg-[#252525] text-[#ffb300]' : 'bg-[#e6f0fa] text-[#206bc4]'}`}>{p.sold} sold</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`col-span-2 rounded-md shadow-sm border flex flex-col ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
          <PanelHeader title="Low Stock Alerts" icon={IconAlertTriangle} />
          <div className="p-0 overflow-x-auto h-full">
            {stats.lowStock.length === 0 ? (
              <div className={`h-full flex flex-col items-center justify-center py-10 ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>
                <div className="bg-[#2ba02b]/10 p-3 rounded-full mb-3"><IconCheck size={28} stroke={2} className="text-[#2ba02b]" /></div>
                <p className={`text-sm font-medium ${isDark ? 'text-[#e0e0e0]' : 'text-[#182433]'}`}>All products adequately stocked.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className={`text-[11px] uppercase tracking-wider font-semibold border-b ${isDark ? 'bg-[#121212] text-[#a0a0a0] border-[#333333]' : 'bg-[#f8f9fa] text-[#667382] border-[#e6e8e9]'}`}>
                  <tr><th className="px-5 py-3">Product Name</th><th className="px-5 py-3 text-right">Current Stock</th></tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-[#333333] text-[#e0e0e0]' : 'divide-[#e6e8e9] text-[#182433]'}`}>
                  {stats.lowStock.map(product => (
                    <tr key={product.id} className={`transition-colors ${isDark ? 'hover:bg-[#252525]' : 'hover:bg-[#f8f9fa]'}`}>
                      <td className={`px-5 py-3 text-sm ${isDark ? 'text-[#e0e0e0]' : 'text-[#182433]'}`}>{product.name}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${product.stock === 0 ? 'bg-[#d63939]/10 text-[#d63939]' : 'bg-[#f59f00]/10 text-[#f59f00]'}`}>
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
      </div>
    </div>
  );
}