import { useState, useEffect } from 'react';
import { IconUsers, IconUserPlus, IconWallet, IconTrash, IconX, IconCheck } from '@tabler/icons-react';
import { useToast } from '../contexts/ToastContext';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState({ currency: 'USD' });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [creditModalData, setCreditModalData] = useState(null); // Holds customer object to add credit to
  
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [creditAmount, setCreditAmount] = useState('');
  
  const showToast = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    if (window.electronAPI) {
      try {
        setCustomers(await window.electronAPI.getCustomers());
        const sData = await window.electronAPI.getSettings();
        const sObj = {};
        sData.forEach(item => sObj[item.key] = item.value);
        setSettings({ currency: sObj.currency || 'USD' });
      } catch (error) { console.error(error); }
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (window.electronAPI) {
      try {
        await window.electronAPI.addCustomer(formData);
        loadData();
        setIsAddModalOpen(false);
        setFormData({ name: '', phone: '', email: '' });
        showToast("Customer added successfully!", "success");
      } catch (error) { showToast("Failed to add customer.", "error"); }
    }
  };

  const handleAddCredit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(creditAmount);
    if (!amount || amount <= 0) return;

    if (window.electronAPI && creditModalData) {
      try {
        await window.electronAPI.updateCredit({ id: creditModalData.id, amount });
        loadData();
        setCreditModalData(null);
        setCreditAmount('');
        showToast(`Added ${settings.currency === 'USD' ? '$' : ''}${amount} credit to ${creditModalData.name}`, "success");
      } catch (error) { showToast("Failed to add store credit.", "error"); }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this customer? Their store credit will be lost.") && window.electronAPI) {
      await window.electronAPI.deleteCustomer(id);
      loadData();
      showToast("Customer profile deleted.", "success");
    }
  };

  const currencySymbol = { USD: '$', EUR: '€', GBP: '£', PHP: '₱' }[settings.currency] || '$';
  const inputClass = "bg-white border border-[#e6e8e9] rounded-md px-3 py-2 text-[#182433] text-sm focus:outline-none focus:border-[#206bc4] transition-colors w-full";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#182433]">Customer Directory</h2>
          <p className="text-[#667382] text-sm mt-1">Manage store credit and customer profiles.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center bg-[#206bc4] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#1d5fb0] transition-colors shadow-sm"
        >
          <IconUserPlus stroke={2} size={18} className="mr-2" /> Add Customer
        </button>
      </div>

      <div className="bg-white border border-[#e6e8e9] rounded-md shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f8f9fa] text-[11px] uppercase tracking-wider text-[#667382] font-bold border-b border-[#e6e8e9]">
            <tr>
              <th className="px-5 py-3">Customer Name</th>
              <th className="px-5 py-3">Contact Info</th>
              <th className="px-5 py-3 text-right">Store Credit Balance</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6e8e9] text-[#182433]">
            {customers.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-5 py-12 text-center text-[#667382]">
                  <IconUsers stroke={1} className="mx-auto h-12 w-12 mb-3 text-[#dce1e7]" />
                  <p className="text-base font-medium text-[#182433]">No customers yet</p>
                  <p className="text-sm mt-1">Start building your loyalty database.</p>
                </td>
              </tr>
            ) : (
              customers.map(customer => (
                <tr key={customer.id} className="hover:bg-[#f8f9fa] transition-colors group">
                  <td className="px-5 py-4 font-semibold text-[#182433]">{customer.name}</td>
                  <td className="px-5 py-4 text-[#667382] text-xs">
                    <div>{customer.phone || 'No phone'}</div>
                    <div>{customer.email || 'No email'}</div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className={`font-bold ${customer.store_credit > 0 ? 'text-[#2ba02b]' : 'text-[#667382]'}`}>
                      {currencySymbol}{customer.store_credit.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right space-x-2">
                    <button 
                      onClick={() => setCreditModalData(customer)}
                      className="inline-flex items-center px-2.5 py-1.5 rounded border border-[#e6e8e9] text-xs font-medium text-[#182433] bg-white hover:bg-[#f4f6fa] hover:text-[#206bc4] transition-colors shadow-sm"
                    >
                      <IconWallet size={14} className="mr-1.5" stroke={2} /> Top Up Credit
                    </button>
                    <button onClick={() => handleDelete(customer.id)} className="text-[#667382] hover:text-[#d63939] p-1 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                      <IconTrash stroke={1.5} size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: Add Customer */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#182433]/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#e6e8e9] flex justify-between items-center bg-[#f8f9fa]">
              <h3 className="font-bold text-[#182433] text-lg">New Customer Profile</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#667382] hover:text-[#d63939]"><IconX stroke={2} size={20} /></button>
            </div>
            <form onSubmit={handleAddCustomer}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#182433] mb-1.5">Full Name</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder="e.g. Jane Doe" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#182433] mb-1.5">Phone Number</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className={inputClass} placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#182433] mb-1.5">Email Address</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className={inputClass} placeholder="Optional" />
                </div>
              </div>
              <div className="px-6 py-4 bg-[#f8f9fa] border-t border-[#e6e8e9] flex justify-end">
                <button type="submit" className="bg-[#206bc4] text-white px-5 py-2 rounded-md text-sm font-bold shadow-sm hover:bg-[#1d5fb0]">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Top Up Store Credit */}
      {creditModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#182433]/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#e6e8e9] bg-[#f8f9fa]">
              <h3 className="font-bold text-[#182433] text-lg flex items-center"><IconWallet className="mr-2 text-[#2ba02b]" /> Add Store Credit</h3>
              <p className="text-xs text-[#667382] mt-1">Depositing funds for {creditModalData.name}</p>
            </div>
            <form onSubmit={handleAddCredit}>
              <div className="p-6">
                <label className="block text-xs font-semibold text-[#182433] mb-1.5 uppercase tracking-wide">Deposit Amount ({currencySymbol})</label>
                <input 
                  type="number" step="0.01" required value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} 
                  className={`${inputClass} text-lg font-bold py-3`} placeholder="0.00" autoFocus
                />
              </div>
              <div className="flex border-t border-[#e6e8e9]">
                <button type="button" onClick={() => setCreditModalData(null)} className="flex-1 py-3 text-sm font-medium text-[#667382] hover:bg-[#f8f9fa] border-r border-[#e6e8e9]">Cancel</button>
                <button type="submit" className="flex-1 py-3 text-sm font-bold text-[#2ba02b] hover:bg-[#2ba02b]/10">Confirm Deposit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}