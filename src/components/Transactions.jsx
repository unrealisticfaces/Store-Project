import { useState, useEffect, useMemo } from 'react';
import { IconReceipt2, IconEye, IconX, IconPackage, IconFileDownload, IconPrinter, IconSearch, IconChevronUp, IconChevronDown, IconSelector, IconAlertCircle, IconRotate2, IconTrendingUp, IconCalendarEvent } from '@tabler/icons-react';
import { useToast } from '../contexts/ToastContext';

export default function Transactions({ theme }) {
  const [transactions, setTransactions] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [refundConfirmInvoice, setRefundConfirmInvoice] = useState(null);
  const [settings, setSettings] = useState({ storeName: 'My Store', currency: 'PHP' });
  
  const [dateFilter, setDateFilter] = useState('Today');
  const [specificDate, setSpecificDate] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const showToast = useToast();
  const isDark = theme === 'dark';

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    if (window.electronAPI) {
      try {
        setTransactions(await window.electronAPI.getTransactions() || []);
        const sData = await window.electronAPI.getSettings();
        const sObj = { storeName: 'My Store', currency: 'PHP' };
        sData.forEach(item => sObj[item.key] = item.value);
        setSettings(sObj);
      } catch (error) {}
    }
  };

  const handleRefund = async () => {
    if (window.electronAPI && refundConfirmInvoice) {
      try {
        await window.electronAPI.refundOrder(refundConfirmInvoice.id);
        showToast(`Invoice ${refundConfirmInvoice.invoice_id} has been refunded securely.`, "success");
        setRefundConfirmInvoice(null);
        setSelectedInvoice(null);
        loadData();
      } catch (e) { showToast("Refund failed. Invoice may already be voided.", "error"); }
    }
  };

  const handleExportCSV = async () => {
    if (transactions.length === 0) return;
    if (window.electronAPI) {
      const success = await window.electronAPI.exportCsv(transactions);
      if (success) showToast("CSV Exported Successfully!", "success");
    }
  };

  const handlePrintReceipt = async () => {
    if (window.electronAPI && selectedInvoice) {
      await window.electronAPI.printReceipt({ order: selectedInvoice, settings });
    }
  };

  const currencySymbol = { USD: '$', EUR: '€', GBP: '£', PHP: '₱' }[settings.currency] || '₱';

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  const filteredAndSorted = useMemo(() => {
    let sortable = [...transactions];
    
    if (dateFilter !== 'All Time') {
      const now = new Date();
      let start = new Date(now);
      let end = new Date(now);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);

      if (dateFilter === 'Today') {
      } else if (dateFilter === 'Yesterday') {
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
      } else if (dateFilter === 'This Week') {
        const day = start.getDay() || 7;
        start.setDate(start.getDate() - day + 1);
      } else if (dateFilter === 'Last Week') {
        const day = start.getDay() || 7;
        start.setDate(start.getDate() - day - 6);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23,59,59,999);
      } else if (dateFilter === 'This Month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (dateFilter === 'Specific Date' && specificDate) {
        const [year, month, day] = specificDate.split('-');
        start = new Date(year, parseInt(month) - 1, parseInt(day), 0, 0, 0, 0);
        end = new Date(year, parseInt(month) - 1, parseInt(day), 23, 59, 59, 999);
      }
      
      sortable = sortable.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      sortable = sortable.filter(t => (t.invoice_id && t.invoice_id.toLowerCase().includes(q)) || (t.customer_name && t.customer_name.toLowerCase().includes(q)));
    }

    sortable.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === 'totalItems') {
        aVal = a.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        bVal = b.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      }
      if (sortConfig.key === 'finalTotal') {
        aVal = (a.total || 0) - (a.credit_used || 0);
        bVal = (b.total || 0) - (b.credit_used || 0);
      }
      if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
    return sortable;
  }, [transactions, searchQuery, sortConfig, dateFilter, specificDate]);

  const totalEarned = useMemo(() => {
    return filteredAndSorted.reduce((sum, o) => sum + (o.status !== 'refunded' ? ((o.total || 0) - (o.credit_used || 0)) : 0), 0);
  }, [filteredAndSorted]);

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSorted.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [totalPages, currentPage]);

  const inputClass = isDark ? "bg-[#121212] border border-[#333333] rounded-md px-3 py-2 text-[#e0e0e0] text-sm focus:outline-none focus:border-[#ffb300]" : "bg-white border border-[#e6e8e9] rounded-md px-3 py-2 text-[#182433] text-sm focus:outline-none focus:border-[#206bc4]";
  const thClass = `px-5 py-3 cursor-pointer select-none transition-colors ${isDark ? 'hover:bg-[#252525]' : 'hover:bg-[#e6e8e9]/50'}`;
  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <IconSelector size={14} className={isDark ? "text-[#555]" : "text-[#a0aab5]"} />;
    return sortConfig.direction === 'ascending' ? <IconChevronUp size={14} className={isDark ? "text-[#ffb300]" : "text-[#206bc4]"} /> : <IconChevronDown size={14} className={isDark ? "text-[#ffb300]" : "text-[#206bc4]"} />;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative pb-10">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#182433]'}`}>Transactions</h2>
        <button onClick={handleExportCSV} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors border ${isDark ? 'bg-[#1a1a1a] border-[#333333] text-[#e0e0e0] hover:border-[#ffb300]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:bg-[#f8f9fa]'}`}>
          <IconFileDownload stroke={1.5} size={18} className={`mr-2 ${isDark ? 'text-[#ffb300]' : 'text-[#206bc4]'}`} /> Export to CSV
        </button>
      </div>

      <div className={`p-4 rounded-md shadow-sm border flex flex-col md:flex-row items-center justify-between gap-4 ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-start md:items-center">
          <div className={`inline-flex rounded-md p-1 shadow-sm border ${isDark ? 'bg-[#1a1a1a] border-[#333333]' : 'bg-[#f4f6fa] border-[#e6e8e9]'}`}>
            {['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Specific Date'].map(opt => (
              <button key={opt} onClick={() => setDateFilter(opt)} className={`px-3 py-1 text-xs font-medium rounded transition-colors ${dateFilter === opt ? (isDark ? 'bg-[#252525] text-[#ffb300] shadow-sm' : 'bg-white text-[#182433] shadow-sm') : (isDark ? 'text-[#a0a0a0] hover:text-white' : 'text-[#667382] hover:text-[#182433]')}`}>
                {opt}
              </button>
            ))}
          </div>
          {dateFilter === 'Specific Date' && (
             <div className={`relative inline-flex items-center shadow-sm rounded border w-36 ${isDark ? 'bg-[#121212] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
                <div className={`absolute left-2.5 flex items-center pointer-events-none ${isDark ? 'text-[#7a7a7a]' : 'text-[#a0aab5]'}`}><IconCalendarEvent size={14} stroke={1.5} /></div>
                <input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} className={`w-full pl-8 pr-2 py-1 text-xs bg-transparent focus:outline-none ${isDark ? 'text-white' : 'text-[#182433]'}`} />
             </div>
          )}
        </div>
        <div className="text-right">
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center justify-end ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>Total Sales for Period</p>
          <h3 className={`text-2xl font-bold flex items-center justify-end ${isDark ? 'text-[#ffb300]' : 'text-[#206bc4]'}`}><IconTrendingUp className="mr-2" size={24} /> {currencySymbol}{totalEarned.toFixed(2)}</h3>
        </div>
      </div>

      <div className={`border rounded-md shadow-sm overflow-hidden flex flex-col ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
        <div className={`p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-4 ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-white'}`}>
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>Show</span>
            <select value={itemsPerPage} onChange={(e) => {setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}} className={`${inputClass} py-1.5 pr-8`}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667382]"><IconSearch size={16} /></div>
            <input type="text" value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} placeholder="Search Invoice ID or Customer..." className={`${inputClass} pl-9 w-full sm:w-64`} />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`text-[11px] uppercase tracking-wider font-semibold border-b ${isDark ? 'bg-[#121212] text-[#a0a0a0] border-[#333333]' : 'bg-[#f8f9fa] text-[#667382] border-[#e6e8e9]'}`}>
              <tr>
                <th className={thClass} onClick={() => requestSort('invoice_id')}><div className="flex items-center justify-between">Invoice ID <SortIcon column="invoice_id" /></div></th>
                <th className={thClass} onClick={() => requestSort('date')}><div className="flex items-center justify-between">Date & Time <SortIcon column="date" /></div></th>
                <th className={thClass} onClick={() => requestSort('customer_name')}><div className="flex items-center justify-between">Customer <SortIcon column="customer_name" /></div></th>
                <th className={thClass} onClick={() => requestSort('totalItems')}><div className="flex items-center justify-between">Items <SortIcon column="totalItems" /></div></th>
                <th className={thClass} onClick={() => requestSort('finalTotal')}><div className="flex items-center justify-between">Amount Paid <SortIcon column="finalTotal" /></div></th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-[#333333] text-[#e0e0e0]' : 'divide-[#e6e8e9] text-[#182433]'}`}>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className={`px-5 py-10 text-center ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>
                    <IconReceipt2 stroke={1} className="mx-auto h-10 w-10 mb-2 opacity-50" />
                    <p>No transactions found.</p>
                  </td>
                </tr>
              ) : (
                currentItems.map((invoice) => {
                  const totalItems = invoice.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                  const finalTotal = (invoice.total || 0) - (invoice.credit_used || 0);
                  const isRefunded = invoice.status === 'refunded';
                  return (
                    <tr key={invoice.id} className={`transition-colors ${isDark ? 'hover:bg-[#252525]' : 'hover:bg-[#f8f9fa]'}`}>
                      <td className={`px-5 py-3 font-semibold ${isRefunded ? 'text-[#667382] line-through' : (isDark ? 'text-[#ffb300]' : 'text-[#206bc4]')}`}>{invoice.invoice_id}</td>
                      <td className={`px-5 py-3 ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>{new Date(invoice.date).toLocaleString()}</td>
                      <td className="px-5 py-3">{invoice.customer_name || <span className={`italic ${isDark ? 'text-[#555]' : 'text-[#667382]'}`}>Guest</span>}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-0.5 rounded border text-xs font-medium ${isDark ? 'bg-[#121212] border-[#333333] text-[#a0a0a0]' : 'bg-[#f4f6fa] border-[#e6e8e9] text-[#667382]'}`}>
                          {totalItems}
                        </span>
                      </td>
                      <td className={`px-5 py-3 font-bold ${isRefunded ? 'text-[#d63939]' : ''}`}>{currencySymbol}{finalTotal.toFixed(2)}</td>
                      <td className="px-5 py-3 text-center">
                        {isRefunded 
                          ? <span className="bg-[#d63939]/10 text-[#d63939] border border-[#d63939]/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">Refunded</span>
                          : <span className="bg-[#2ba02b]/10 text-[#2ba02b] border border-[#2ba02b]/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">Completed</span>
                        }
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => setSelectedInvoice(invoice)} className={`flex items-center justify-end w-full space-x-1 transition-colors font-medium text-xs uppercase tracking-wide ${isDark ? 'text-[#a0a0a0] hover:text-[#ffb300]' : 'text-[#667382] hover:text-[#206bc4]'}`}>
                          <IconEye stroke={1.5} size={16} /> <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
          <p className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>Showing {filteredAndSorted.length === 0 ? 0 : indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredAndSorted.length)} of {filteredAndSorted.length} entries</p>
          <div className="flex space-x-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`px-3 py-1.5 text-sm font-medium rounded border transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-[#252525] border-[#333333] text-[#e0e0e0] hover:bg-[#333333]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:bg-[#e6e8e9]'}`}>Previous</button>
            <div className={`flex items-center justify-center px-3 py-1.5 text-sm font-bold rounded ${isDark ? 'bg-[#ffb300] text-[#121212]' : 'bg-[#206bc4] text-white'}`}>{currentPage}</div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`px-3 py-1.5 text-sm font-medium rounded border transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-[#252525] border-[#333333] text-[#e0e0e0] hover:bg-[#333333]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:bg-[#e6e8e9]'}`}>Next</button>
          </div>
        </div>
      </div>
      
      {/* Detail View Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121212]/60 backdrop-blur-sm p-4">
          <div className={`rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1e1e1e] border border-[#333333]' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
              <h3 className={`font-bold text-lg flex items-center ${isDark ? 'text-white' : 'text-[#182433]'}`}>
                <IconReceipt2 stroke={1.5} className={`mr-2 ${isDark ? 'text-[#ffb300]' : 'text-[#206bc4]'}`} />
                Invoice: {selectedInvoice.invoice_id}
                {selectedInvoice.status === 'refunded' && <span className="ml-3 bg-[#d63939]/10 text-[#d63939] px-2 py-0.5 rounded text-xs font-bold uppercase">Refunded</span>}
              </h3>
              <button onClick={() => setSelectedInvoice(null)} className={`p-1 transition-colors ${isDark ? 'text-[#a0a0a0] hover:text-[#d63939]' : 'text-[#667382] hover:text-[#d63939]'}`}><IconX stroke={2} size={20} /></button>
            </div>

            <div className={`p-6 overflow-y-auto flex-1 ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>Transaction Date</p>
                  <p className={`mb-3 ${isDark ? 'text-[#e0e0e0]' : 'text-[#182433]'}`}>{new Date(selectedInvoice.date).toLocaleString()}</p>
                  
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>Cashier Name</p>
                  <p className={isDark ? 'text-[#e0e0e0]' : 'text-[#182433]'}>{selectedInvoice.cashier_name || 'Admin'}</p>
                  
                  {selectedInvoice.customer_name && <p className={`text-sm font-medium mt-3 ${isDark ? 'text-[#ffb300]' : 'text-[#206bc4]'}`}>Customer: {selectedInvoice.customer_name}</p>}
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>Amount Paid</p>
                  <p className={`text-2xl font-bold ${selectedInvoice.status === 'refunded' ? 'text-[#d63939] line-through' : 'text-[#2ba02b]'}`}>
                    {currencySymbol}{((selectedInvoice.total || 0) - (selectedInvoice.credit_used || 0)).toFixed(2)}
                  </p>
                </div>
              </div>

              <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 border-b pb-2 ${isDark ? 'text-[#7a7a7a] border-[#333333]' : 'text-[#667382] border-[#e6e8e9]'}`}>Purchased Items</h4>
              <div className={`space-y-0 divide-y ${isDark ? 'divide-[#333333]' : 'divide-[#e6e8e9]'}`}>
                {selectedInvoice.items && selectedInvoice.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center space-x-3">
                      <div className={`h-8 w-8 rounded border flex items-center justify-center ${isDark ? 'bg-[#121212] border-[#333333] text-[#7a7a7a]' : 'bg-[#f4f6fa] border-[#e6e8e9] text-[#667382]'}`}>
                        <IconPackage size={16} stroke={1.5} />
                      </div>
                      <div>
                        <h4 className={`font-semibold text-sm ${isDark ? 'text-[#e0e0e0]' : 'text-[#182433]'}`}>{item.product_name}</h4>
                        <p className={`text-[11px] ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>{currencySymbol}{(item.price || 0).toFixed(2)} each</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <span className={`text-xs font-medium px-2 py-1 rounded border ${isDark ? 'bg-[#1a1a1a] border-[#333333] text-[#a0a0a0]' : 'bg-[#f8f9fa] border-[#e6e8e9] text-[#667382]'}`}>
                        Qty: {item.quantity}
                      </span>
                      <span className={`font-bold w-20 text-right ${isDark ? 'text-white' : 'text-[#182433]'}`}>{currencySymbol}{((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`mt-4 pt-4 border-t space-y-2 ${isDark ? 'border-[#333333]' : 'border-[#e6e8e9]'}`}>
                {(() => {
                  const subtotal = selectedInvoice.items?.reduce((sum, i) => sum + (i.price * i.quantity), 0) || 0;
                  const taxRate = selectedInvoice.tax_rate !== undefined ? selectedInvoice.tax_rate : (settings.taxRate || 0);
                  const taxAmount = subtotal * (taxRate / 100);
                  return (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className={`font-bold ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>Subtotal</span>
                        <span className={isDark ? 'text-white' : 'text-[#182433]'}>{currencySymbol}{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className={`font-bold ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>VAT ({taxRate}%)</span>
                        <span className={isDark ? 'text-white' : 'text-[#182433]'}>{currencySymbol}{taxAmount.toFixed(2)}</span>
                      </div>
                    </>
                  );
                })()}

                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className={`font-bold ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>Discount Applied</span>
                    <span className="font-bold text-[#d63939]">-{currencySymbol}{(selectedInvoice.discount || 0).toFixed(2)}</span>
                  </div>
                )}
                {selectedInvoice.credit_used > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className={`font-bold ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>Store Credit Used</span>
                    <span className={`font-bold ${isDark ? 'text-[#ffb300]' : 'text-[#206bc4]'}`}>-{currencySymbol}{(selectedInvoice.credit_used || 0).toFixed(2)}</span>
                  </div>
                )}

                {selectedInvoice.cash_handed > 0 && (
                  <>
                    <div className={`mt-2 pt-2 border-t border-dashed ${isDark ? 'border-[#333333]' : 'border-[#e6e8e9]'}`}></div>
                    <div className="flex justify-between items-center text-sm">
                      <span className={`font-bold ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>Cash Handed</span>
                      <span className={isDark ? 'text-white' : 'text-[#182433]'}>{currencySymbol}{(selectedInvoice.cash_handed).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className={`font-bold ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>Change</span>
                      <span className={isDark ? 'text-white' : 'text-[#182433]'}>{currencySymbol}{(selectedInvoice.change).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className={`px-6 py-4 border-t flex justify-between items-center ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
              {selectedInvoice.status !== 'refunded' ? (
                <button onClick={() => setRefundConfirmInvoice(selectedInvoice)} className="flex items-center text-[#d63939] hover:bg-[#d63939]/10 px-3 py-1.5 rounded transition-colors text-sm font-bold">
                  <IconRotate2 size={16} className="mr-1.5" /> Void & Refund Invoice
                </button>
              ) : <div></div>}
              
              <div className="flex space-x-3">
                <button onClick={handlePrintReceipt} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm border ${isDark ? 'bg-[#252525] border-[#333333] text-[#e0e0e0] hover:bg-[#333333]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:bg-[#f4f6fa]'}`}>
                  <IconPrinter size={18} stroke={1.5} className="mr-2" /> Print Receipt
                </button>
                <button onClick={() => setSelectedInvoice(null)} className={`px-5 py-2 rounded-md text-sm font-bold shadow-sm transition-colors ${isDark ? 'bg-[#ffb300] text-[#121212] hover:bg-[#d97706]' : 'bg-[#206bc4] text-white hover:bg-[#1d5fb0]'}`}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabler Modal Danger: Confirm Refund */}
      {refundConfirmInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#121212]/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden text-center animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1e1e1e] border border-[#333333]' : 'bg-white'}`}>
            <button onClick={() => setRefundConfirmInvoice(null)} className="absolute top-4 right-4 text-[#a0a0a0] hover:text-[#d63939] transition-colors"><IconX size={20} stroke={2} /></button>
            <div className="p-6 pt-10">
              <div className="mx-auto w-16 h-16 mb-4 bg-[#d63939] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#d63939]/30">
                <IconAlertCircle size={32} stroke={2} />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-[#182433]'}`}>Refund Transaction?</h3>
              <p className={`text-sm mb-2 ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>You are about to void Invoice {refundConfirmInvoice.invoice_id}.</p>
              <div className={`p-3 rounded text-left text-xs mb-2 ${isDark ? 'bg-[#252525] text-[#e0e0e0]' : 'bg-[#f8f9fa] text-[#182433]'}`}>
                <ul className="list-disc pl-4 space-y-1">
                  <li>{currencySymbol}{((refundConfirmInvoice.total || 0) - (refundConfirmInvoice.credit_used || 0)).toFixed(2)} will be deducted from today's revenue.</li>
                  <li>Inventory items will be restocked.</li>
                  {refundConfirmInvoice.credit_used > 0 && <li>{currencySymbol}{refundConfirmInvoice.credit_used.toFixed(2)} Store Credit will be returned.</li>}
                </ul>
              </div>
            </div>
            <div className={`flex flex-col p-4 gap-2 border-t ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
              <button onClick={handleRefund} className="w-full py-2.5 text-sm font-bold text-white bg-[#d63939] rounded shadow-sm hover:bg-[#b02a2a] transition-colors">Yes, Process Refund</button>
              <button onClick={() => setRefundConfirmInvoice(null)} className={`w-full py-2.5 text-sm font-bold rounded transition-colors ${isDark ? 'text-[#a0a0a0] hover:text-white hover:bg-[#333333]' : 'text-[#667382] hover:text-[#182433] hover:bg-[#e6e8e9]'}`}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}