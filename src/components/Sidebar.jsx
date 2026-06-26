import { LayoutDashboard, Package, ShoppingCart, Tags, Percent, Users, Settings, BarChart2 } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="w-64 bg-zinc-950 text-zinc-300 border-r border-zinc-800 flex flex-col h-screen overflow-y-auto">
      <div className="p-4 flex items-center space-x-2 border-b border-zinc-800">
        <div className="bg-amber-500 p-1.5 rounded text-black">
          <Package size={20} />
        </div>
        <div>
          <h1 className="font-bold text-white text-sm">Store Admin</h1>
          <p className="text-xs text-zinc-500">Local System</p>
        </div>
      </div>
      
      <div className="flex-1 py-4">
        <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Store Management</div>
        <nav className="space-y-1 px-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center px-3 py-2 rounded-md group ${activeTab === 'dashboard' ? 'bg-amber-500/10 text-amber-500' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
          >
            <LayoutDashboard size={18} className="mr-3" />
            <span className="text-sm font-medium">Dashboard</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center px-3 py-2 rounded-md group ${activeTab === 'orders' ? 'bg-amber-500/10 text-amber-500' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
          >
            <ShoppingCart size={18} className="mr-3" />
            <span className="text-sm font-medium flex-1 text-left">Orders</span>
            <span className="bg-amber-500 text-black font-bold text-xs px-2 py-0.5 rounded-full">12</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center px-3 py-2 rounded-md group ${activeTab === 'inventory' ? 'bg-amber-500/10 text-amber-500' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
          >
            <Package size={18} className="mr-3" />
            <span className="text-sm font-medium">Inventory</span>
          </button>
          
          <button className="w-full flex items-center px-3 py-2 text-zinc-400 hover:bg-zinc-900 hover:text-white rounded-md group">
            <Tags size={18} className="mr-3" />
            <span className="text-sm font-medium text-left">Categories</span>
          </button>
          
          <button className="w-full flex items-center px-3 py-2 text-zinc-400 hover:bg-zinc-900 hover:text-white rounded-md group">
            <Percent size={18} className="mr-3" />
            <span className="text-sm font-medium text-left">Discounts</span>
          </button>
        </nav>

        <div className="px-3 mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">System & Data</div>
        <nav className="space-y-1 px-2">
          <button className="w-full flex items-center px-3 py-2 text-zinc-400 hover:bg-zinc-900 hover:text-white rounded-md group">
            <BarChart2 size={18} className="mr-3" />
            <span className="text-sm font-medium text-left">Analytics</span>
          </button>
          <button className="w-full flex items-center px-3 py-2 text-zinc-400 hover:bg-zinc-900 hover:text-white rounded-md group">
            <Users size={18} className="mr-3" />
            <span className="text-sm font-medium text-left">Staff Accounts</span>
          </button>
          <button className="w-full flex items-center px-3 py-2 text-zinc-400 hover:bg-zinc-900 hover:text-white rounded-md group">
            <Settings size={18} className="mr-3" />
            <span className="text-sm font-medium text-left">Store Settings</span>
          </button>
        </nav>
      </div>

      <div className="p-4 border-t border-zinc-800 flex items-center space-x-3">
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium text-white">
          AD
        </div>
        <div>
          <p className="text-sm font-medium text-white">Admin</p>
          <p className="text-xs text-zinc-500">Local Manager</p>
        </div>
      </div>
    </aside>
  );
}