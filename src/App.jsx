import { useState } from 'react';
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
  
  // Default cashiers to shifts so they can open the register first
  const [activeTab, setActiveTab] = useState('shifts'); 

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
    <div className="flex h-screen bg-[#f4f6fa] overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* Admin Only Routes */}
          {currentUser.role === 'admin' && activeTab === 'dashboard' && <Dashboard />}
          {currentUser.role === 'admin' && activeTab === 'inventory' && <Inventory />}
          {currentUser.role === 'admin' && activeTab === 'customers' && <Customers />}
          {currentUser.role === 'admin' && activeTab === 'settings' && <Settings />}
          {currentUser.role === 'admin' && activeTab === 'staff' && <StaffAccounts currentUser={currentUser} />}
          
          {/* Shared Routes */}
          {activeTab === 'shifts' && <ShiftManager currentUser={currentUser} />}
          {activeTab === 'orders' && <Orders />}
          {activeTab === 'transactions' && <Transactions />}

        </div>
      </main>
    </div>
  );
}