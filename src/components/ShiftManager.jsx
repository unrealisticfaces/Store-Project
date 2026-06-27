import { useState, useEffect } from 'react';
import { IconCash, IconLockOpen, IconLock, IconPrinter } from '@tabler/icons-react';
import { useToast } from '../contexts/ToastContext';

export default function ShiftManager({ currentUser }) {
  const [activeShift, setActiveShift] = useState(null);
  const [startingCash, setStartingCash] = useState('');
  const [actualCash, setActualCash] = useState('');
  const [settings, setSettings] = useState({ currency: 'USD', storeName: 'Store' });
  const [zReportData, setZReportData] = useState(null);
  
  const showToast = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    if (window.electronAPI) {
      const shift = await window.electronAPI.getActiveShift();
      setActiveShift(shift);
      const sData = await window.electronAPI.getSettings();
      const sObj = {};
      sData.forEach(item => sObj[item.key] = item.value);
      setSettings(sObj);
    }
  };

  const handleOpenShift = async (e) => {
    e.preventDefault();
    if (window.electronAPI) {
      try {
        await window.electronAPI.openShift({ userId: currentUser.id, startingCash: parseFloat(startingCash) });
        showToast("Shift opened successfully. Register active.", "success");
        loadData();
      } catch (err) { showToast("Failed to open shift.", "error"); }
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (window.electronAPI && activeShift) {
      try {
        const result = await window.electronAPI.closeShift({ shiftId: activeShift.id, actualCash: parseFloat(actualCash) });
        setZReportData({ ...result, startingCash: activeShift.starting_cash });
        setActiveShift(null);
        showToast("Shift closed. Z-Report generated.", "success");
      } catch (err) { showToast("Failed to close shift.", "error"); }
    }
  };

  const handlePrintZReport = async () => {
    if (window.electronAPI && zReportData) {
      await window.electronAPI.printZReport({ shiftData: zReportData, settings, userName: currentUser.name });
    }
  };

  const sym = settings.currency === 'EUR' ? '€' : settings.currency === 'GBP' ? '£' : settings.currency === 'PHP' ? '₱' : '$';
  const inputClass = "w-full bg-white border border-[#e6e8e9] rounded-md px-3 py-3 text-lg font-bold focus:outline-none focus:border-[#206bc4]";

  return (
    <div className="max-w-2xl mx-auto space-y-6 mt-10">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-[#182433]">Cash Register Management</h2>
        <p className="text-[#667382] mt-2">Manage your daily drawer counts and shift reporting.</p>
      </div>

      {!activeShift && !zReportData && (
        <div className="bg-white border border-[#e6e8e9] rounded-lg shadow-sm p-8 text-center animate-in fade-in">
          <div className="mx-auto w-16 h-16 bg-[#206bc4]/10 text-[#206bc4] rounded-full flex items-center justify-center mb-4">
            <IconLockOpen size={32} stroke={2} />
          </div>
          <h3 className="text-xl font-bold text-[#182433] mb-4">Start New Shift</h3>
          <form onSubmit={handleOpenShift} className="max-w-xs mx-auto">
            <label className="block text-xs font-bold text-[#667382] uppercase tracking-wide mb-2 text-left">Starting Cash in Drawer</label>
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667382]"><IconCash size={20} /></div>
              <input type="number" step="0.01" required value={startingCash} onChange={(e) => setStartingCash(e.target.value)} className={`${inputClass} pl-10`} placeholder="0.00" autoFocus />
            </div>
            <button type="submit" className="w-full bg-[#206bc4] text-white py-3 rounded-md font-bold hover:bg-[#1d5fb0] transition-colors shadow-sm text-lg">
              Open Register
            </button>
          </form>
        </div>
      )}

      {activeShift && (
        <div className="bg-white border border-[#e6e8e9] rounded-lg shadow-sm p-8 text-center animate-in fade-in">
          <div className="mx-auto w-16 h-16 bg-[#d63939]/10 text-[#d63939] rounded-full flex items-center justify-center mb-4">
            <IconLock size={32} stroke={2} />
          </div>
          <h3 className="text-xl font-bold text-[#182433] mb-2">Close Shift (Z-Report)</h3>
          <p className="text-sm text-[#667382] mb-6">Count the physical cash currently in the drawer to close the register.</p>
          <form onSubmit={handleCloseShift} className="max-w-xs mx-auto">
            <label className="block text-xs font-bold text-[#667382] uppercase tracking-wide mb-2 text-left">Actual Cash Counted</label>
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667382]"><IconCash size={20} /></div>
              <input type="number" step="0.01" required value={actualCash} onChange={(e) => setActualCash(e.target.value)} className={`${inputClass} pl-10`} placeholder="0.00" autoFocus />
            </div>
            <button type="submit" className="w-full bg-[#d63939] text-white py-3 rounded-md font-bold hover:bg-[#b02a2a] transition-colors shadow-sm text-lg">
              Close Register
            </button>
          </form>
        </div>
      )}

      {zReportData && (
        <div className="bg-white border border-[#e6e8e9] rounded-lg shadow-sm p-8 animate-in fade-in zoom-in-95">
          <div className="flex justify-between items-center border-b border-[#e6e8e9] pb-4 mb-6">
            <h3 className="text-xl font-bold text-[#182433]">Shift Closed successfully</h3>
            <button onClick={handlePrintZReport} className="flex items-center bg-[#f4f6fa] border border-[#e6e8e9] px-4 py-2 rounded text-sm font-bold text-[#182433] hover:text-[#206bc4] transition-colors">
              <IconPrinter size={18} className="mr-2" /> Print Z-Report
            </button>
          </div>
          
          <div className="space-y-4 max-w-sm mx-auto">
            <div className="flex justify-between text-sm"><span className="text-[#667382]">Starting Cash:</span><span className="font-semibold">{sym}{zReportData.startingCash.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[#667382]">Cash Sales:</span><span className="font-semibold">{sym}{zReportData.cashSales.toFixed(2)}</span></div>
            <div className="flex justify-between text-lg font-bold border-t border-[#e6e8e9] pt-4"><span className="text-[#182433]">Expected in Drawer:</span><span className="text-[#206bc4]">{sym}{zReportData.expected.toFixed(2)}</span></div>
            <div className="flex justify-between text-lg font-bold border-b border-[#e6e8e9] pb-4"><span className="text-[#182433]">Actual Cash Counted:</span><span>{sym}{zReportData.actualCash.toFixed(2)}</span></div>
            
            <div className="flex justify-between text-xl font-black mt-4">
              <span>Over / Short:</span>
              <span className={(zReportData.actualCash - zReportData.expected) < 0 ? 'text-[#d63939]' : 'text-[#2ba02b]'}>
                {sym}{(zReportData.actualCash - zReportData.expected).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="mt-8 text-center"><button onClick={() => setZReportData(null)} className="text-sm font-medium text-[#667382] hover:text-[#182433] underline">Acknowledge & Return</button></div>
        </div>
      )}
    </div>
  );
}