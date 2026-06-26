import { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import StatCard from './components/StatCard';
import OverviewChart from './components/OverviewChart';
import RecentSales from './components/RecentSales';
import Inventory from './components/Inventory';
import Orders from './components/Orders';

import { DollarSign, Users, CreditCard, Activity } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex h-screen bg-black overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <div className="flex-1 overflow-y-auto p-8 bg-zinc-950">
          
          {activeTab === 'dashboard' && (
            <>
              <div className="flex items-center justify-between space-y-2 mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
                <div className="flex items-center space-x-2">
                  <button className="bg-amber-500 text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-amber-400 transition-colors">
                    Download
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <StatCard title="Total Revenue" value="$45,231.89" subtitle="+20.1% from last month" icon={DollarSign} />
                <StatCard title="Subscriptions" value="+2350" subtitle="+180.1% from last month" icon={Users} />
                <StatCard title="Sales" value="+12,234" subtitle="+19% from last month" icon={CreditCard} />
                <StatCard title="Active Now" value="+573" subtitle="+201 since last hour" icon={Activity} />
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <OverviewChart />
                <RecentSales />
              </div>
            </>
          )}

          {activeTab === 'inventory' && <Inventory />}
          {activeTab === 'orders' && <Orders />}
          
          {activeTab === 'orders' && (
            <div className="flex items-center justify-center h-full">
              <p className="text-zinc-500 text-lg">Orders module coming soon...</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}