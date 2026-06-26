import { Search, Sun, Settings, Bell } from 'lucide-react';

export default function TopNav() {
  return (
    <header className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-6">
      <nav className="flex space-x-6 text-sm font-medium text-zinc-400">
        <a href="#" className="text-white">Overview</a>
        <a href="#" className="hover:text-white transition-colors">Orders</a>
        <a href="#" className="hover:text-white transition-colors">Inventory</a>
        <a href="#" className="hover:text-white transition-colors">Reports</a>
      </nav>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search SKU or Order ID..."
            className="h-9 w-64 bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-4 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
          />
        </div>
        <button className="text-zinc-400 hover:text-white transition-colors">
          <Sun size={20} />
        </button>
        <button className="text-zinc-400 hover:text-white transition-colors">
          <Settings size={20} />
        </button>
        <button className="text-zinc-400 hover:text-white transition-colors">
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
}