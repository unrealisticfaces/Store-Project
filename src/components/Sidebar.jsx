import { IconDashboard, IconPackage, IconShoppingCart, IconUsers, IconSettings, IconReceipt2, IconLogout, IconCash } from '@tabler/icons-react';

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout }) {
  const activeClass = "w-full flex items-center px-3 py-2 rounded-md group bg-[#e6f0fa] text-[#206bc4] font-medium";
  const inactiveClass = "w-full flex items-center px-3 py-2 rounded-md group text-[#667382] hover:bg-[#f4f6fa] hover:text-[#182433] transition-colors";

  const isAdmin = currentUser?.role === 'admin';

  return (
    <aside className="w-64 bg-white border-r border-[#e6e8e9] flex flex-col h-screen overflow-y-auto">
      <div className="p-5 flex items-center space-x-3 border-b border-[#e6e8e9]">
        <div className="bg-[#206bc4] p-1.5 rounded text-white shadow-sm">
          <IconPackage stroke={1.5} size={24} />
        </div>
        <div>
          <h1 className="font-bold text-[#182433] text-base tracking-tight">Store Admin</h1>
        </div>
      </div>
      
      <div className="flex-1 py-4 px-3 flex flex-col">
        
        {isAdmin && (
          <>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-widest text-[#667382]">Analytics</div>
            <nav className="space-y-1 mb-6">
              <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? activeClass : inactiveClass}>
                <IconDashboard stroke={1.5} size={20} className="mr-3" />
                <span className="text-sm">Dashboard</span>
              </button>
            </nav>
          </>
        )}

        <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-widest text-[#667382]">Store Operations</div>
        <nav className="space-y-1 mb-6">
          <button onClick={() => setActiveTab('shifts')} className={activeTab === 'shifts' ? activeClass : inactiveClass}>
            <IconCash stroke={1.5} size={20} className="mr-3" />
            <span className="text-sm flex-1 text-left">Cash Register</span>
          </button>
          <button onClick={() => setActiveTab('orders')} className={activeTab === 'orders' ? activeClass : inactiveClass}>
            <IconShoppingCart stroke={1.5} size={20} className="mr-3" />
            <span className="text-sm flex-1 text-left">Point of Sale</span>
          </button>
          <button onClick={() => setActiveTab('transactions')} className={activeTab === 'transactions' ? activeClass : inactiveClass}>
            <IconReceipt2 stroke={1.5} size={20} className="mr-3" />
            <span className="text-sm text-left">Sales History</span>
          </button>
          {isAdmin && (
            <button onClick={() => setActiveTab('inventory')} className={activeTab === 'inventory' ? activeClass : inactiveClass}>
              <IconPackage stroke={1.5} size={20} className="mr-3" />
              <span className="text-sm">Inventory Management</span>
            </button>
          )}
        </nav>

        {isAdmin && (
          <>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-widest text-[#667382]">Administration</div>
            <nav className="space-y-1">
              <button onClick={() => setActiveTab('customers')} className={activeTab === 'customers' ? activeClass : inactiveClass}>
                <IconUsers stroke={1.5} size={20} className="mr-3" />
                <span className="text-sm text-left">Customers</span>
              </button>
              <button onClick={() => setActiveTab('staff')} className={activeTab === 'staff' ? activeClass : inactiveClass}>
                <IconUsers stroke={1.5} size={20} className="mr-3" />
                <span className="text-sm text-left">Staff Accounts</span>
              </button>
              <button onClick={() => setActiveTab('settings')} className={activeTab === 'settings' ? activeClass : inactiveClass}>
                <IconSettings stroke={1.5} size={20} className="mr-3" />
                <span className="text-sm text-left">Store Settings</span>
              </button>
            </nav>
          </>
        )}
      </div>

      <div className="p-4 border-t border-[#e6e8e9] bg-[#f8f9fa]">
        <div className="flex justify-between items-center px-2">
          <div>
            <p className="text-sm font-bold text-[#182433] leading-tight">{currentUser?.name}</p>
            <p className="text-[11px] font-bold uppercase text-[#206bc4] tracking-wider mt-0.5">{currentUser?.role}</p>
          </div>
          <button onClick={onLogout} className="text-[#667382] hover:text-[#d63939] p-1.5 bg-white border border-[#e6e8e9] rounded shadow-sm hover:border-[#d63939] transition-colors" title="Log Out">
            <IconLogout stroke={1.5} size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}