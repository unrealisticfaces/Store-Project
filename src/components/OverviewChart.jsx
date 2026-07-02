import Chart from 'react-apexcharts';

export default function OverviewChart({ data, theme, dateRange }) {
  const isDark = theme === 'dark';

  const seriesData = data.map(d => {
    let xVal = d.date;
    if (dateRange !== 'today') xVal = new Date(d.date).getTime();
    return { x: xVal, y: d.total };
  });

  const series = [{ name: 'Revenue', data: seriesData }];

  const options = {
    chart: { type: 'area', fontFamily: 'inherit', toolbar: { show: false }, background: 'transparent' },
    colors: [isDark ? '#ffb300' : '#206bc4'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: isDark ? 0.4 : 0.2, opacityTo: 0, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      type: dateRange === 'today' ? 'category' : 'datetime',
      labels: {
         format: dateRange === '7days' ? 'ddd' : 'dd MMM',
         style: { colors: isDark ? '#a0a0a0' : '#667382' }
      },
      axisBorder: { show: false }, 
      axisTicks: { show: false },
      tooltip: { enabled: false }
    },
    yaxis: { labels: { style: { colors: isDark ? '#a0a0a0' : '#667382' }, formatter: (val) => `$${val}` } },
    grid: { borderColor: isDark ? '#333333' : '#e6e8e9', strokeDashArray: 3, xaxis: { lines: { show: false } } },
    theme: { mode: isDark ? 'dark' : 'light' },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      x: { format: 'dd MMM yyyy (dddd)' },
      y: { formatter: (val) => `$${val.toFixed(2)}` }
    }
  };

  return (
    <div className="w-full h-full min-h-[300px]">
      <Chart options={options} series={series} type="area" height="100%" />
    </div>
  );
}