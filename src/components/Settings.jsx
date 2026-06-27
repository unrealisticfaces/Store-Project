import { useState, useEffect } from 'react';
import { IconSettings, IconTags, IconPlus, IconTrash, IconDeviceFloppy, IconMoon, IconSun } from '@tabler/icons-react';
import { useToast } from '../contexts/ToastContext';

export default function Settings({ theme, setTheme }) {
  const [activeSegment, setActiveSegment] = useState('general');
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [settings, setSettingsState] = useState({ 
    storeName: '', storeAddress: '', storePhone: '', receiptFooter: '', currency: 'USD', taxRate: '0' 
  });
  
  const showToast = useToast();
  const isDark = theme === 'dark';

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    if (window.electronAPI) {
      try {
        setCategories(await window.electronAPI.getCategories());
        const sData = await window.electronAPI.getSettings();
        const sObj = { storeName: '', storeAddress: '', storePhone: '', receiptFooter: '', currency: 'USD', taxRate: '0' };
        sData.forEach(item => { if (item.key !== 'theme') sObj[item.key] = item.value });
        setSettingsState(sObj);
      } catch (error) {}
    }
  };

  const handleThemeToggle = async (mode) => {
    setTheme(mode);
    if (window.electronAPI) {
      await window.electronAPI.updateSetting({ key: 'theme', value: mode });
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
        showToast("Category added successfully.", "success");
      } catch (error) { showToast("Failed to add category.", "error"); }
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.deleteCategory(id);
        loadData();
        showToast("Category removed.", "success");
      } catch (error) { showToast("Failed to remove category.", "error"); }
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (window.electronAPI) {
      try {
        await window.electronAPI.updateSetting({ key: 'storeName', value: settings.storeName });
        await window.electronAPI.updateSetting({ key: 'storeAddress', value: settings.storeAddress });
        await window.electronAPI.updateSetting({ key: 'storePhone', value: settings.storePhone });
        await window.electronAPI.updateSetting({ key: 'receiptFooter', value: settings.receiptFooter });
        await window.electronAPI.updateSetting({ key: 'currency', value: settings.currency });
        await window.electronAPI.updateSetting({ key: 'taxRate', value: settings.taxRate });
        showToast('Store settings updated securely!', 'success');
      } catch (error) { showToast('Failed to save settings.', 'error'); }
    }
  };

  const handleManualBackup = async () => {
    if (window.electronAPI) {
      try {
        const location = await window.electronAPI.manualBackup();
        showToast(`Backed up to: ${location}`, 'success');
      } catch (error) { showToast('Backup failed.', 'error'); }
    }
  };

  const inputClass = isDark 
    ? "bg-[#121212] border border-[#333333] rounded-md px-3 py-2 text-[#e0e0e0] text-sm focus:outline-none focus:border-[#ffb300] transition-colors w-full"
    : "bg-[#f4f6fa] border border-[#e6e8e9] rounded-md px-3 py-2 text-[#182433] text-sm focus:outline-none focus:border-[#206bc4] transition-colors w-full";
  
  const labelClass = `block text-xs font-semibold mb-1.5 uppercase tracking-wide ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-[#ffffff]' : 'text-[#182433]'}`}>Store Settings</h2>
        
        <div className={`flex items-center space-x-1 p-1 rounded-md border ${isDark ? 'bg-[#1a1a1a] border-[#333333]' : 'bg-[#f4f6fa] border-[#e6e8e9]'}`}>
          <button onClick={() => handleThemeToggle('light')} className={`flex items-center px-3 py-1.5 text-sm font-medium rounded transition-colors ${!isDark ? 'bg-white text-[#206bc4] shadow-sm' : 'text-[#a0a0a0] hover:text-[#ffffff]'}`}>
            <IconSun size={16} stroke={2} className="mr-1.5" /> Light
          </button>
          <button onClick={() => handleThemeToggle('dark')} className={`flex items-center px-3 py-1.5 text-sm font-medium rounded transition-colors ${isDark ? 'bg-[#252525] text-[#ffb300] shadow-sm' : 'text-[#667382] hover:text-[#182433]'}`}>
            <IconMoon size={16} stroke={2} className="mr-1.5" /> Dark
          </button>
        </div>
      </div>

      <div className={`flex space-x-2 border-b mb-6 ${isDark ? 'border-[#333333]' : 'border-[#e6e8e9]'}`}>
        <button onClick={() => setActiveSegment('general')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeSegment === 'general' ? (isDark ? 'border-[#ffb300] text-[#ffb300]' : 'border-[#206bc4] text-[#206bc4]') : `border-transparent ${isDark ? 'text-[#a0a0a0] hover:text-[#ffffff]' : 'text-[#667382] hover:text-[#182433]'}`}`}>
          <div className="flex items-center"><IconSettings size={18} className="mr-2" /> General & Receipts</div>
        </button>
        <button onClick={() => setActiveSegment('categories')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeSegment === 'categories' ? (isDark ? 'border-[#ffb300] text-[#ffb300]' : 'border-[#206bc4] text-[#206bc4]') : `border-transparent ${isDark ? 'text-[#a0a0a0] hover:text-[#ffffff]' : 'text-[#667382] hover:text-[#182433]'}`}`}>
          <div className="flex items-center"><IconTags size={18} className="mr-2" /> Categories</div>
        </button>
      </div>

      {activeSegment === 'general' && (
        <div className={`border rounded-md shadow-sm ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
          <form onSubmit={handleSaveSettings}>
            <div className="p-6 space-y-6">
              <div>
                <h3 className={`text-lg font-bold mb-4 border-b pb-2 ${isDark ? 'text-[#ffffff] border-[#333333]' : 'text-[#182433] border-[#e6e8e9]'}`}>Business Details</h3>
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label className={labelClass}>Store Name</label>
                    <input type="text" required value={settings.storeName} onChange={(e) => setSettingsState({...settings, storeName: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Physical Address (Prints on Receipt)</label>
                    <input type="text" value={settings.storeAddress} onChange={(e) => setSettingsState({...settings, storeAddress: e.target.value})} className={inputClass} placeholder="123 Commerce St, City, ST 12345" />
                  </div>
                  <div>
                    <label className={labelClass}>Contact Phone</label>
                    <input type="text" value={settings.storePhone} onChange={(e) => setSettingsState({...settings, storePhone: e.target.value})} className={inputClass} placeholder="(555) 123-4567" />
                  </div>
                  <div>
                    <label className={labelClass}>Receipt Footer Message</label>
                    <input type="text" value={settings.receiptFooter} onChange={(e) => setSettingsState({...settings, receiptFooter: e.target.value})} className={inputClass} placeholder="Thank you for shopping with us!" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className={`text-lg font-bold mb-4 border-b pb-2 pt-4 ${isDark ? 'text-[#ffffff] border-[#333333]' : 'text-[#182433] border-[#e6e8e9]'}`}>Financial Settings</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Currency Display</label>
                    <select value={settings.currency} onChange={(e) => setSettingsState({...settings, currency: e.target.value})} className={inputClass}>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="PHP">PHP (₱)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Default Tax Rate (%)</label>
                    <input type="number" step="0.01" required value={settings.taxRate} onChange={(e) => setSettingsState({...settings, taxRate: e.target.value})} className={inputClass} />
                  </div>
                </div>
              </div>

              <div className={`mt-8 p-4 border rounded-md flex items-center justify-between ${isDark ? 'bg-[#252525] border-[#333333]' : 'bg-[#f4f6fa] border-[#e6e8e9]'}`}>
                <div>
                  <h4 className={`text-sm font-bold ${isDark ? 'text-[#ffffff]' : 'text-[#182433]'}`}>Manual Database Backup</h4>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>Create an instant offline copy of your store's data.</p>
                </div>
                <button type="button" onClick={handleManualBackup} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm border ${isDark ? 'bg-[#1a1a1a] border-[#333333] text-[#e0e0e0] hover:text-[#ffb300] hover:border-[#ffb300]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:bg-[#e6e8e9]'}`}>
                  Backup Now
                </button>
              </div>
            </div>
            
            <div className={`px-6 py-4 border-t flex justify-end ${isDark ? 'bg-[#1a1a1a] border-[#333333]' : 'bg-[#f8f9fa] border-[#e6e8e9]'}`}>
              <button type="submit" className={`flex items-center px-6 py-2 rounded-md text-sm font-bold transition-colors shadow-sm ${isDark ? 'bg-[#ffb300] text-[#121212] hover:bg-[#d97706]' : 'bg-[#206bc4] text-white hover:bg-[#1d5fb0]'}`}>
                <IconDeviceFloppy size={18} className="mr-2" /> Save Configuration
              </button>
            </div>
          </form>
        </div>
      )}

      {activeSegment === 'categories' && (
        <div className={`border rounded-md shadow-sm p-6 ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
          <form onSubmit={handleAddCategory} className="flex gap-3 mb-6">
            <input type="text" required value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name..." className={inputClass} />
            <button type="submit" className={`px-4 py-2 rounded-md text-sm font-bold transition-colors flex items-center whitespace-nowrap ${isDark ? 'bg-[#ffb300] text-[#121212] hover:bg-[#d97706]' : 'bg-[#206bc4] text-white hover:bg-[#1d5fb0]'}`}>
              <IconPlus size={16} className="mr-1" /> Add
            </button>
          </form>

          <div className="space-y-2">
            {categories.length === 0 ? (
              <p className={`text-sm text-center py-4 ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>No categories defined yet.</p>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className={`flex items-center justify-between p-3 border rounded-md ${isDark ? 'bg-[#252525] border-[#333333]' : 'bg-[#f8f9fa] border-[#e6e8e9]'}`}>
                  <span className={`text-sm font-medium ${isDark ? 'text-[#e0e0e0]' : 'text-[#182433]'}`}>{cat.name}</span>
                  <button onClick={() => handleDeleteCategory(cat.id)} className={`p-1 transition-colors ${isDark ? 'text-[#a0a0a0] hover:text-[#ffb300]' : 'text-[#667382] hover:text-[#d63939]'}`}>
                    <IconTrash size={18} stroke={1.5} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}