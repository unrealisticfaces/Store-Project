import Chart from 'react-apexcharts';

export default function OverviewChart({ data }) {
  // Format data for ApexCharts
  const series = [{
    name: 'Revenue',
    data: data.map(item => item.total)
  }];

  const options = {
    chart: {
      type: 'area',
      fontFamily: 'inherit',
      toolbar: { show: false },
      zoom: { enabled: false },
      sparkline: { enabled: false },
    },
    colors: ['#206bc4'],
    dataLabels: { enabled: false },
    fill: {
      type: 'solid',
      opacity: 0.16,
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    xaxis: {
      categories: data.map(item => item.name),
      tooltip: { enabled: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: '#667382', fontSize: '12px' }
      }
    },
    yaxis: {
      labels: {
        style: { colors: '#667382', fontSize: '12px' },
        formatter: (value) => `$${value}`
      }
    },
    grid: {
      borderColor: '#e6e8e9',
      strokeDashArray: 4,
      padding: { top: 0, right: 0, bottom: 0, left: 10 }
    },
    tooltip: { theme: 'light' }
  };

  return (
    <div className="h-[300px] w-full">
      <Chart options={options} series={series} type="area" height="100%" />
    </div>
  );
}