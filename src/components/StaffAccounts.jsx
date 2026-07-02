import { useState, useEffect } from 'react';
import { IconUsers, IconUserPlus, IconTrash, IconX, IconEdit, IconPhoto } from '@tabler/icons-react';
import { useToast } from '../contexts/ToastContext';

export default function StaffAccounts({ currentUser, theme }) {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({ id: null, name: '', username: '', password: '', role: 'cashier', image: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const showToast = useToast();
  const isDark = theme === 'dark';

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => { if (window.electronAPI) { try { setUsers(await window.electronAPI.getUsers()); } catch (error) {} } };

  const openAddModal = () => { setIsEditing(false); setFormData({ id: null, name: '', username: '', password: '', role: 'cashier', image: '' }); setConfirmPassword(''); setIsModalOpen(true); };
  const openEditModal = (user) => { setIsEditing(true); setFormData({ ...user, password: '' }); setConfirmPassword(''); setIsModalOpen(true); };

  const handleImageSelect = async () => { if (window.electronAPI) { const imagePath = await window.electronAPI.selectImage(); if (imagePath) setFormData({ ...formData, image: imagePath }); } };
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = async (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file && window.electronAPI) {
        const reader = new FileReader();
        reader.onload = async (event) => { const base64Data = event.target.result; const imagePath = await window.electronAPI.saveBase64Image({ base64Data, filename: file.name }); if (imagePath) setFormData({ ...formData, image: imagePath }); };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== confirmPassword) return showToast("Passwords do not match!", "error");
    if (isEditing && !formData.password) return showToast("Please confirm with a password.", "error");

    if (window.electronAPI) {
      try {
        if (isEditing) { await window.electronAPI.updateUser(formData); showToast("Staff account updated successfully!", "success"); } 
        else { await window.electronAPI.addUser(formData); showToast("Staff account created!", "success"); }
        loadUsers(); setIsModalOpen(false);
      } catch (error) { showToast("Failed to save. Username may be taken.", "error"); }
    }
  };

  const handleDelete = async (id) => {
    if (id === currentUser.id) return showToast("You cannot delete your own account.", "error");
    if (window.confirm("Are you sure you want to revoke access for this user?")) {
      if (window.electronAPI) { await window.electronAPI.deleteUser(id); loadUsers(); showToast("Account deleted.", "success"); }
    }
  };

  const inputClass = isDark ? "bg-[#121212] border border-[#333333] rounded-md px-3 py-2 text-[#e0e0e0] text-sm focus:outline-none focus:border-[#ffb300]" : "bg-white border border-[#e6e8e9] rounded-md px-3 py-2 text-[#182433] text-sm focus:outline-none focus:border-[#206bc4]";
  const labelClass = `block text-xs font-semibold mb-1.5 uppercase tracking-wide ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#182433]'}`}>Staff Accounts</h2>
        <button onClick={openAddModal} className={`flex items-center text-[#121212] px-4 py-2 rounded-md text-sm font-bold shadow-sm transition-colors ${isDark ? 'bg-[#ffb300] hover:bg-[#d97706]' : 'bg-[#206bc4] text-white hover:bg-[#1d5fb0]'}`}>
          <IconUserPlus stroke={2} size={18} className="mr-2" /> Add Staff
        </button>
      </div>

      <div className={`border rounded-md shadow-sm overflow-hidden flex flex-col ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
        <table className="w-full text-left text-sm">
          <thead className={`text-[11px] uppercase tracking-wider font-bold border-b ${isDark ? 'bg-[#121212] text-[#a0a0a0] border-[#333333]' : 'bg-[#f8f9fa] text-[#667382] border-[#e6e8e9]'}`}>
            <tr><th className="px-5 py-3 w-10">Avatar</th><th className="px-5 py-3">Staff Member</th><th className="px-5 py-3">Username</th><th className="px-5 py-3">Access Level</th><th className="px-5 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-[#333333] text-[#e0e0e0]' : 'divide-[#e6e8e9] text-[#182433]'}`}>
            {users.map(user => (
              <tr key={user.id} className={`transition-colors ${isDark ? 'hover:bg-[#252525]' : 'hover:bg-[#f8f9fa]'}`}>
                <td className="px-5 py-3">{user.image ? <img src={user.image} className="w-10 h-10 rounded-full object-cover border shadow-sm" /> : <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[#fff] shadow-sm ${isDark ? 'bg-[#333333]' : 'bg-[#a0aab5]'}`}>{user.name.charAt(0)}</div>}</td>
                <td className="px-5 py-4 font-semibold">{user.name} {user.id === currentUser.id && <span className={`ml-2 text-[10px] px-2 py-0.5 rounded border ${isDark ? 'bg-[#ffb300]/10 border-[#ffb300]/20 text-[#ffb300]' : 'bg-[#206bc4]/10 border-[#206bc4]/20 text-[#206bc4]'}`}>You</span>}</td>
                <td className={`px-5 py-4 ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>{user.username}</td>
                <td className="px-5 py-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${user.role === 'admin' ? 'bg-[#d63939]/10 text-[#d63939] border-[#d63939]/20' : 'bg-[#2ba02b]/10 text-[#2ba02b] border-[#2ba02b]/20'}`}>{user.role}</span></td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => openEditModal(user)} className={`p-1.5 rounded transition-colors ${isDark ? 'text-[#a0a0a0] hover:text-[#ffb300] hover:bg-[#333333]' : 'text-[#667382] hover:text-[#206bc4] hover:bg-[#e6e8e9]'}`}><IconEdit stroke={1.5} size={18} /></button>
                    <button onClick={() => handleDelete(user.id)} disabled={user.id === currentUser.id} className={`p-1.5 rounded transition-colors ${user.id === currentUser.id ? 'opacity-30 cursor-not-allowed' : (isDark ? 'text-[#a0a0a0] hover:text-[#d63939] hover:bg-[#333333]' : 'text-[#667382] hover:text-[#d63939] hover:bg-[#e6e8e9]')}`}><IconTrash stroke={1.5} size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121212]/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1e1e1e] border border-[#333333]' : 'bg-white'}`}>
            <div className={`px-8 py-5 flex justify-between items-center border-b ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
               <h3 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-[#182433]'}`}>{isEditing ? 'Update Staff Member' : 'Add Staff Member'}</h3>
               <button onClick={() => setIsModalOpen(false)} className={`p-1 transition-colors ${isDark ? 'text-[#a0a0a0] hover:text-[#d63939]' : 'text-[#667382] hover:text-[#d63939]'}`}><IconX stroke={2} size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col">
               <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                      <div className="col-span-2"><label className={labelClass}>Full Name</label><input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={inputClass} /></div>
                      <div className="col-span-2"><label className={labelClass}>Login Username</label><input type="text" required value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className={inputClass} /></div>
                      <div><label className={labelClass}>New Password {isEditing && "*"}</label><input type="password" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className={inputClass} /></div>
                      <div><label className={labelClass}>Confirm Password {isEditing && "*"}</label><input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} /></div>
                      <div className="col-span-2"><label className={labelClass}>System Access Role</label><select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className={inputClass}><option value="cashier">Cashier (POS & Shifts Only)</option><option value="admin">Administrator (Full Access)</option></select></div>
                    </div>
                  </div>
                  <div className="md:col-span-1 flex flex-col">
                     <label className={labelClass}>Profile Avatar</label>
                     <div onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={handleImageSelect} className={`flex-1 min-h-[220px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${isDragging ? (isDark ? 'border-[#ffb300] bg-[#ffb300]/10' : 'border-[#206bc4] bg-[#e6f0fa]') : (isDark ? 'border-[#333333] bg-[#121212] hover:border-[#555]' : 'border-[#e6e8e9] bg-[#f8f9fa] hover:border-[#dce1e7]')}`}>
                       {formData.image ? <div className="p-2 w-full h-full relative group"><img src={formData.image} className="w-full h-full object-cover rounded-lg shadow-sm" /><div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"><span className="text-white text-sm font-bold">Change Image</span></div></div> : <div className="text-center p-6 pointer-events-none"><div className={`mx-auto w-12 h-12 mb-3 rounded-full flex items-center justify-center shadow-sm ${isDark ? 'bg-[#252525] text-[#a0a0a0]' : 'bg-white text-[#667382]'}`}><IconPhoto size={24} stroke={1.5} /></div><p className={`text-sm font-bold ${isDark ? 'text-[#e0e0e0]' : 'text-[#182433]'}`}>Upload Avatar</p></div>}
                     </div>
                  </div>
               </div>
               <div className={`px-8 py-5 border-t flex justify-end space-x-3 ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className={`px-5 py-2.5 text-sm font-bold rounded-md transition-colors ${isDark ? 'text-[#a0a0a0] hover:bg-[#333333]' : 'text-[#667382] hover:bg-[#e6e8e9]'}`}>Cancel</button>
                  <button type="submit" className={`px-6 py-2.5 rounded-md text-sm font-bold shadow-sm transition-colors flex items-center ${isDark ? 'bg-[#ffb300] text-[#121212] hover:bg-[#d97706]' : 'bg-[#206bc4] text-white hover:bg-[#1d5fb0]'}`}>{isEditing ? 'Save Changes' : 'Create Account'}</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}