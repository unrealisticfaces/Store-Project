import { useState, useEffect } from 'react';
import { IconReceipt2, IconEye, IconX, IconPackage, IconFileDownload, IconPrinter } from '@tabler/icons-react';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [settings, setSettings] = useState({ storeName: 'My Store', currency: 'USD' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    if (window.electronAPI) {
      try {
        const transData = await window.electronAPI.getTransactions();
        setTransactions(transData);
        
        // Fetch Settings for the Receipt Printer
        const sData = await window.electronAPI.getSettings();
        const sObj = {};
        sData.forEach(item => sObj[item.key] = item.value);
        setSettings({ storeName: sObj.storeName || 'My Store', currency: sObj.currency || 'USD' });
      } catch (error) { console.error(error); }
    }
  };

  const handleExportCSV = async () => {
    if (transactions.length === 0) return alert("No transactions to export.");
    if (window.electronAPI) {
      const success = await window.electronAPI.exportCsv(transactions);
      if (success) alert("CSV Exported Successfully!");
    }
  };

  const handlePrintReceipt = async () => {
    if (window.electronAPI && selectedOrder) {
      await window.electronAPI.printReceipt({ order: selectedOrder, settings });
    }
  };

  const currencySymbol = { USD: '$', EUR: '€', GBP: '£', PHP: '₱' }[settings.currency] || '$';

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#182433]">Sales History</h2>
        
        {/* NEW: Export Button */}
        <button 
          onClick={handleExportCSV}
          className="flex items-center bg-white border border-[#e6e8e9] text-[#182433] px-4 py-2 rounded-md text-sm font-medium hover:bg-[#f8f9fa] hover:border-[#dce1e7] transition-all shadow-sm"
        >
          <IconFileDownload stroke={1.5} size={18} className="mr-2 text-[#206bc4]" />
          Export to CSV
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-[#e6e8e9] rounded-md shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f8f9fa] text-[11px] uppercase tracking-wider text-[#667382] font-bold border-b border-[#e6e8e9]">
            <tr>
              <th className="px-5 py-3">Order ID</th>
              <th className="px-5 py-3">Date & Time</th>
              <th className="px-5 py-3 text-center">Total Items</th>
              <th className="px-5 py-3">Amount Paid</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6e8e9] text-[#182433]">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-5 py-10 text-center text-[#667382]">
                  <IconReceipt2 stroke={1} className="mx-auto h-10 w-10 mb-2 text-[#dce1e7]" />
                  <p>No transactions recorded yet.</p>
                </td>
              </tr>
            ) : (
              transactions.map((order) => {
                const totalItems = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                return (
                  <tr key={order.id} className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="px-5 py-3 font-semibold text-[#206bc4]">#{order.id}</td>
                    <td className="px-5 py-3 text-[#667382]">{new Date(order.date).toLocaleString()}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="bg-[#f4f6fa] text-[#667382] px-2.5 py-0.5 rounded border border-[#e6e8e9] text-xs font-medium">
                        {totalItems} items
                      </span>
                    </td>
                    <td className="px-5 py-3 font-bold">{currencySymbol}{order.total.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right">
                      <button 
                        onClick={() => setSelectedOrder(order)} 
                        className="flex items-center justify-end w-full space-x-1 text-[#667382] hover:text-[#206bc4] transition-colors font-medium text-xs uppercase tracking-wide"
                      >
                        <IconEye stroke={1.5} size={16} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal Overlay */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#182433]/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-lg w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-[#e6e8e9] flex justify-between items-center bg-[#f8f9fa]">
              <h3 className="font-bold text-[#182433] text-lg flex items-center">
                <IconReceipt2 stroke={1.5} className="mr-2 text-[#206bc4]" />
                Order #{selectedOrder.id}
              </h3>
              <button onClick={() => setSelectedOrder(null)} className="text-[#667382] hover:text-[#d63939] transition-colors p-1">
                <IconX stroke={2} size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-white">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-xs font-bold text-[#667382] uppercase tracking-wider mb-1">Transaction Date</p>
                  <p className="text-[#182433]">{new Date(selectedOrder.date).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-[#667382] uppercase tracking-wider mb-1">Total Paid</p>
                  <p className="text-2xl font-bold text-[#2ba02b]">{currencySymbol}{selectedOrder.total.toFixed(2)}</p>
                </div>
              </div>

              <h4 className="text-xs font-bold text-[#667382] uppercase tracking-wider mb-3 border-b border-[#e6e8e9] pb-2">Purchased Items</h4>
              
              <div className="space-y-0 divide-y divide-[#e6e8e9]">
                {selectedOrder.items && selectedOrder.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded bg-[#f4f6fa] border border-[#e6e8e9] flex items-center justify-center text-[#667382]">
                        <IconPackage size={16} stroke={1.5} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#182433] text-sm">{item.product_name}</h4>
                        <p className="text-[11px] text-[#667382]">{currencySymbol}{item.price.toFixed(2)} each</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <span className="text-xs font-medium text-[#667382] bg-[#f8f9fa] px-2 py-1 rounded border border-[#e6e8e9]">
                        Qty: {item.quantity}
                      </span>
                      <span className="font-bold text-[#182433] w-20 text-right">{currencySymbol}{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#e6e8e9] bg-[#f8f9fa] flex justify-between">
              {/* NEW: Native Print Button */}
              <button 
                onClick={handlePrintReceipt}
                className="flex items-center bg-white border border-[#e6e8e9] text-[#182433] px-4 py-2 rounded-md text-sm font-medium hover:bg-[#f4f6fa] transition-colors shadow-sm"
              >
                <IconPrinter size={18} stroke={1.5} className="mr-2 text-[#667382]" />
                Print Receipt
              </button>
              
              <button 
                onClick={() => setSelectedOrder(null)}
                className="bg-[#206bc4] text-white px-5 py-2 rounded-md text-sm font-bold hover:bg-[#1d5fb0] transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}