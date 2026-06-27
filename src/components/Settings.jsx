import { useState, useEffect } from 'react';
import { IconSettings, IconTags, IconPlus, IconTrash, IconDeviceFloppy } from '@tabler/icons-react';
import { useToast } from '../contexts/ToastContext'; // <-- ADD THIS

export default function Settings() {
  const [activeSegment, setActiveSegment] = useState('general');
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [settings, setSettings] = useState({ storeName: '', currency: 'USD', taxRate: '0' });
  const [saveStatus, setSaveStatus] = useState('');
  const showToast = useToast(); // <-- ADD THIS

  useEffect(() => {
    loadData();
  }, []);

  const handleManualBackup = async () => {
    if (window.electronAPI) {
      try {
        const location = await window.electronAPI.manualBackup();
        showToast(`Database backed up securely!`, 'success');
      } catch (error) { showToast('Backup failed.', 'error'); }
    }
  };

  const loadData = async () => {
    if (window.electronAPI) {
      try {
        const catData = await window.electronAPI.getCategories();
        setCategories(catData);
        
        const setData = await window.electronAPI.getSettings();
        const settingsObj = {};
        setData.forEach(item => settingsObj[item.key] = item.value);
        setSettings(settingsObj);
      } catch (error) { console.error(error); }
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    if (window.electronAPI) {
      try {
        await window.electronAPI.addCategory(newCategory.trim());
        setNewCategory('');
        loadData();
      } catch (error) { alert("Category already exists or failed to add."); }
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.deleteCategory(id);
        loadData();
      } catch (error) { console.error(error); }
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (window.electronAPI) {
      try {
        await window.electronAPI.updateSetting({ key: 'storeName', value: settings.storeName });
        await window.electronAPI.updateSetting({ key: 'currency', value: settings.currency });
        await window.electronAPI.updateSetting({ key: 'taxRate', value: settings.taxRate });
        
        showToast('Store settings updated securely!', 'success'); // <-- USE TOAST
      } catch (error) { 
        showToast('Failed to save settings.', 'error'); // <-- USE TOAST
      }
    }
  };

  const inputClass = "w-full bg-white border border-[#e6e8e9] rounded-md px-3 py-2 text-[#182433] text-sm focus:outline-none focus:border-[#206bc4] transition-colors";
  const labelClass = "block text-xs font-semibold text-[#182433] mb-1.5";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#182433]">Store Settings</h2>
      </div>

      {/* Tabler Segmented Control */}
      <div className="inline-flex bg-[#e6e8e9] rounded-md p-1">
        <button 
          onClick={() => setActiveSegment('general')}
          className={`flex items-center px-4 py-1.5 rounded text-sm font-medium transition-colors ${activeSegment === 'general' ? 'bg-white text-[#182433] shadow-sm' : 'text-[#667382] hover:text-[#182433]'}`}
        >
          <IconSettings size={16} stroke={1.5} className="mr-2" /> General
        </button>
        <button 
          onClick={() => setActiveSegment('categories')}
          className={`flex items-center px-4 py-1.5 rounded text-sm font-medium transition-colors ${activeSegment === 'categories' ? 'bg-white text-[#182433] shadow-sm' : 'text-[#667382] hover:text-[#182433]'}`}
        >
          <IconTags size={16} stroke={1.5} className="mr-2" /> Categories
        </button>
      </div>

      <div className="bg-white border border-[#e6e8e9] rounded-md shadow-sm overflow-hidden">
        
        {/* General Settings Form Layout */}
        {activeSegment === 'general' && (
          <form onSubmit={handleSaveSettings} className="p-6">
            <div className="mb-6 pb-6 border-b border-[#e6e8e9]">
              <h3 className="text-lg font-bold text-[#182433] mb-1">General Details</h3>
              <p className="text-sm text-[#667382]">Update your store's basic profile information.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className={labelClass}>Store Name</label>
                <input type="text" value={settings.storeName} onChange={(e) => setSettings({...settings, storeName: e.target.value})} className={inputClass} placeholder="e.g. My Tabler Store" />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Currency Code</label>
                  <select value={settings.currency} onChange={(e) => setSettings({...settings, currency: e.target.value})} className={inputClass}>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="PHP">PHP (₱)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Default Tax Rate (%)</label>
                  <input type="number" step="0.01" value={settings.taxRate} onChange={(e) => setSettings({...settings, taxRate: e.target.value})} className={inputClass} />
                </div>
                <div className="mt-8 p-4 bg-[#f4f6fa] border border-[#e6e8e9] rounded-md flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#182433]">Manual Database Backup</h4>
                  <p className="text-xs text-[#667382] mt-0.5">Create an instant offline copy of your store's data.</p>
                </div>
                <button type="button" onClick={handleManualBackup} className="bg-white border border-[#e6e8e9] text-[#182433] px-4 py-2 rounded-md text-sm font-medium hover:bg-[#e6e8e9] transition-colors shadow-sm">
                  Backup Now
                </button>
              </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-[#e6e8e9] flex items-center justify-between">
              <span className="text-sm text-[#2ba02b] font-medium">{saveStatus}</span>
              <button type="submit" className="flex items-center bg-[#206bc4] text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-[#1d5fb0] transition-colors">
                <IconDeviceFloppy size={18} stroke={1.5} className="mr-2" /> Save Changes
              </button>
            </div>
          </form>
        )}

        {/* Dynamic Categories Manager Layout */}
        {activeSegment === 'categories' && (
          <div className="p-6 flex gap-8">
            <div className="w-1/3 border-r border-[#e6e8e9] pr-8">
              <h3 className="text-lg font-bold text-[#182433] mb-1">Add Category</h3>
              <p className="text-sm text-[#667382] mb-5">Create a new label for organizing your inventory.</p>
              
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div>
                  <label className={labelClass}>Category Name</label>
                  <input type="text" required value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className={inputClass} placeholder="e.g. Electronics" />
                </div>
                <button type="submit" className="w-full flex justify-center items-center bg-[#206bc4] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#1d5fb0] transition-colors">
                  <IconPlus size={18} stroke={2} className="mr-1" /> Add
                </button>
              </form>
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-bold text-[#667382] uppercase tracking-wider mb-4">Current Categories</h3>
              <div className="border border-[#e6e8e9] rounded-md divide-y divide-[#e6e8e9]">
                {categories.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[#667382]">No categories found.</div>
                ) : (
                  categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-[#f8f9fa] transition-colors">
                      <span className="text-sm font-semibold text-[#182433]">{cat.name}</span>
                      <button onClick={() => handleDeleteCategory(cat.id)} className="text-[#667382] hover:text-[#d63939] p-1 transition-colors">
                        <IconTrash size={16} stroke={1.5} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}