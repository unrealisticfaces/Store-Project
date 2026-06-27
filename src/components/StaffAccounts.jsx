import { useState, useEffect } from 'react';
import { IconUserPlus, IconTrash, IconUserCircle, IconX, IconAlertTriangle, IconShieldCheck } from '@tabler/icons-react';

export default function StaffAccounts({ currentUser }) {
  const [users, setUsers] = useState([]);
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmData, setDeleteConfirmData] = useState(null); // Holds object { id, role }
  
  const [formData, setFormData] = useState({ name: '', username: '', password: '', role: 'cashier' });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.getUsers();
        setUsers(data);
      } catch (error) { console.error(error); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (window.electronAPI) {
      try {
        await window.electronAPI.addUser(formData);
        loadUsers();
        setIsAddModalOpen(false);
        setFormData({ name: '', username: '', password: '', role: 'cashier' });
      } catch (error) { alert('Username already exists or failed to create user.'); }
    }
  };

  const triggerDelete = (id, role) => {
    if (role === 'admin' && users.filter(u => u.role === 'admin').length === 1) {
      return alert("Action Denied: You cannot delete the last administrator.");
    }
    if (id === currentUser.id) {
      return alert("Action Denied: You cannot delete your own account while logged in.");
    }
    setDeleteConfirmData({ id, role });
  };

  const executeDelete = async () => {
    if (window.electronAPI && deleteConfirmData) {
      await window.electronAPI.deleteUser(deleteConfirmData.id);
      loadUsers();
      setDeleteConfirmData(null);
    }
  };

  const inputClass = "bg-white border border-[#e6e8e9] rounded-md px-3 py-2 text-[#182433] text-sm focus:outline-none focus:border-[#206bc4] transition-colors w-full";
  const labelClass = "block text-xs font-semibold text-[#182433] mb-1.5 uppercase tracking-wide";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#182433]">Staff Accounts</h2>
          <p className="text-[#667382] text-sm mt-1">Manage system access and permissions.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center bg-[#206bc4] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#1d5fb0] transition-colors shadow-sm"
        >
          <IconUserPlus stroke={2} size={18} className="mr-2" /> Add Staff
        </button>
      </div>

      {/* Tabler Data Table */}
      <div className="bg-white border border-[#e6e8e9] rounded-md shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f8f9fa] text-[11px] uppercase tracking-wider text-[#667382] font-bold border-b border-[#e6e8e9]">
            <tr>
              <th className="px-5 py-3">Staff Member</th>
              <th className="px-5 py-3">Username</th>
              <th className="px-5 py-3">Role Level</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6e8e9] text-[#182433]">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-[#f8f9fa] transition-colors group">
                <td className="px-5 py-4 font-semibold flex items-center text-[#182433]">
                  <IconUserCircle stroke={1.5} className="mr-3 text-[#a0aab5]" size={32} />
                  <div>
                    {user.name}
                    {user.id === currentUser.id && <span className="ml-2 text-[9px] bg-[#f4f6fa] text-[#667382] px-1.5 py-0.5 rounded border border-[#e6e8e9]">YOU</span>}
                  </div>
                </td>
                <td className="px-5 py-4 text-[#667382] font-medium">{user.username}</td>
                <td className="px-5 py-4">
                  <div className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-[#206bc4]/10 text-[#206bc4]' : 'bg-[#f4f6fa] text-[#667382] border border-[#e6e8e9]'}`}>
                    {user.role === 'admin' && <IconShieldCheck size={14} className="mr-1.5" stroke={2} />}
                    {user.role}
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <button 
                    onClick={() => triggerDelete(user.id, user.role)} 
                    className="text-[#667382] hover:text-[#d63939] p-1 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Revoke Access"
                  >
                    <IconTrash stroke={1.5} size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODAL: Add Staff Form --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#182433]/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-[#e6e8e9] flex justify-between items-center bg-[#f8f9fa]">
              <h3 className="font-bold text-[#182433] text-lg flex items-center">
                <IconUserPlus stroke={1.5} className="mr-2 text-[#206bc4]" size={22} />
                New Staff Account
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#667382] hover:text-[#d63939] transition-colors p-1"><IconX stroke={2} size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1">
              <div className="p-6 space-y-5">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className={labelClass}>Login Username</label>
                  <input type="text" required value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className={inputClass} placeholder="e.g. john.doe" />
                </div>
                <div>
                  <label className={labelClass}>Password</label>
                  <input type="password" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className={inputClass} placeholder="Create a secure password" />
                </div>
                <div>
                  <label className={labelClass}>System Permissions</label>
                  <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className={inputClass}>
                    <option value="cashier">Cashier (Point of Sale & Receipts only)</option>
                    <option value="admin">Administrator (Full System Access)</option>
                  </select>
                </div>
              </div>

              <div className="px-6 py-4 bg-[#f8f9fa] border-t border-[#e6e8e9] flex justify-end space-x-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-[#667382] hover:text-[#182433] transition-colors bg-white border border-[#e6e8e9] rounded-md shadow-sm hover:bg-[#f4f6fa]">
                  Cancel
                </button>
                <button type="submit" className="bg-[#206bc4] text-white px-5 py-2 rounded-md text-sm font-bold hover:bg-[#1d5fb0] transition-colors shadow-sm">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Danger Confirmation --- */}
      {deleteConfirmData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#182433]/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm flex flex-col overflow-hidden text-center animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="mx-auto w-12 h-12 mb-4 bg-[#d63939]/10 text-[#d63939] rounded-full flex items-center justify-center">
                <IconAlertTriangle size={24} stroke={2} />
              </div>
              <h3 className="text-lg font-bold text-[#182433] mb-2">Revoke Access?</h3>
              <p className="text-[#667382] text-sm">
                Are you sure you want to delete this staff member? They will lose access to the system immediately.
              </p>
            </div>
            <div className="flex border-t border-[#e6e8e9] bg-[#f8f9fa]">
              <button onClick={() => setDeleteConfirmData(null)} className="flex-1 py-3 text-sm font-medium text-[#667382] hover:text-[#182433] hover:bg-[#e6e8e9]/50 transition-colors border-r border-[#e6e8e9]">
                Cancel
              </button>
              <button onClick={executeDelete} className="flex-1 py-3 text-sm font-bold text-[#d63939] hover:bg-[#d63939]/10 transition-colors">
                Revoke Access
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}