import { useState, useEffect } from 'react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Orders from './components/Orders';
import Transactions from './components/Transactions';
import Settings from './components/Settings';
import StaffAccounts from './components/StaffAccounts';
import Customers from './components/Customers';
import ShiftManager from './components/ShiftManager';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('shifts');
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSettings().then(sData => {
        const t = sData.find(s => s.key === 'theme');
        if (t) setTheme(t.value);
      });
    }
  }, []);

  if (!currentUser) {
    return <Login onLogin={(user) => {
      setCurrentUser(user);
      setActiveTab(user.role === 'admin' ? 'dashboard' : 'shifts');
    }} />;
  }

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans ${theme === 'dark' ? 'bg-[#121212] text-[#e0e0e0]' : 'bg-[#f4f6fa] text-[#182433]'}`}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={handleLogout} theme={theme} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          {currentUser.role === 'admin' && activeTab === 'dashboard' && <Dashboard theme={theme} />}
          {currentUser.role === 'admin' && activeTab === 'inventory' && <Inventory theme={theme} />}
          {currentUser.role === 'admin' && activeTab === 'customers' && <Customers theme={theme} />}
          {currentUser.role === 'admin' && activeTab === 'settings' && <Settings theme={theme} setTheme={setTheme} />}
          {currentUser.role === 'admin' && activeTab === 'staff' && <StaffAccounts currentUser={currentUser} theme={theme} />}
          
          {activeTab === 'shifts' && <ShiftManager currentUser={currentUser} theme={theme} />}
          {activeTab === 'orders' && <Orders theme={theme} />}
          {activeTab === 'transactions' && <Transactions theme={theme} />}
        </div>
      </main>
    </div>
  );
}