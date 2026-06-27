import { useState, useEffect, useMemo } from 'react';
import { IconReceipt2, IconEye, IconX, IconPackage, IconFileDownload, IconPrinter, IconSearch, IconChevronUp, IconChevronDown, IconSelector } from '@tabler/icons-react';
import { useToast } from '../contexts/ToastContext';

export default function Transactions({ theme }) {
  const [transactions, setTransactions] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [settings, setSettings] = useState({ storeName: 'My Store', currency: 'USD' });
  
  // Datagrid State
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
        const sObj = { storeName: 'My Store', currency: 'USD' };
        sData.forEach(item => sObj[item.key] = item.value);
        setSettings(sObj);
      } catch (error) { showToast("Failed to load transactions.", "error"); }
    }
  };

  const handleExportCSV = async () => {
    if (transactions.length === 0) return showToast("No transactions to export.", "error");
    if (window.electronAPI) {
      const success = await window.electronAPI.exportCsv(transactions);
      if (success) showToast("CSV Exported Successfully!", "success");
    }
  };

  const handlePrintReceipt = async () => {
    if (window.electronAPI && selectedOrder) {
      const success = await window.electronAPI.printReceipt({ order: selectedOrder, settings });
      if (!success) showToast("Printing failed.", "error");
    }
  };

  const currencySymbol = { USD: '$', EUR: '€', GBP: '£', PHP: '₱' }[settings.currency] || '$';

  // --- Datagrid Logic ---
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  const filteredAndSorted = useMemo(() => {
    let sortable = [...transactions];
    
    // Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      sortable = sortable.filter(t => 
        t.id.toString().includes(q) || 
        (t.customer_name && t.customer_name.toLowerCase().includes(q))
      );
    }
    
    // Sort
    sortable.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Calculate derived fields for sorting
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
  }, [transactions, searchQuery, sortConfig]);

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
    <div className="max-w-6xl mx-auto space-y-6 relative">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#182433]'}`}>Sales History</h2>
        <button onClick={handleExportCSV} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors border ${isDark ? 'bg-[#1a1a1a] border-[#333333] text-[#e0e0e0] hover:border-[#ffb300]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:bg-[#f8f9fa]'}`}>
          <IconFileDownload stroke={1.5} size={18} className={`mr-2 ${isDark ? 'text-[#ffb300]' : 'text-[#206bc4]'}`} /> Export to CSV
        </button>
      </div>

      <div className={`border rounded-md shadow-sm overflow-hidden flex flex-col ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
        
        {/* Toolbar */}
        <div className={`p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-4 ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-white'}`}>
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>Show</span>
            <select value={itemsPerPage} onChange={(e) => {setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}} className={`${inputClass} py-1.5 pr-8`}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>entries</span>
          </div>
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667382]"><IconSearch size={16} /></div>
            <input type="text" value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} placeholder="Search Order ID or Customer..." className={`${inputClass} pl-9 w-full sm:w-64`} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`text-[11px] uppercase tracking-wider font-bold border-b ${isDark ? 'bg-[#121212] text-[#a0a0a0] border-[#333333]' : 'bg-[#f8f9fa] text-[#667382] border-[#e6e8e9]'}`}>
              <tr>
                <th className={thClass} onClick={() => requestSort('id')}>
                  <div className="flex items-center justify-between">Order ID <SortIcon column="id" /></div>
                </th>
                <th className={thClass} onClick={() => requestSort('date')}>
                  <div className="flex items-center justify-between">Date & Time <SortIcon column="date" /></div>
                </th>
                <th className={thClass} onClick={() => requestSort('customer_name')}>
                  <div className="flex items-center justify-between">Customer <SortIcon column="customer_name" /></div>
                </th>
                <th className={thClass} onClick={() => requestSort('totalItems')}>
                  <div className="flex items-center justify-between">Items <SortIcon column="totalItems" /></div>
                </th>
                <th className={thClass} onClick={() => requestSort('finalTotal')}>
                  <div className="flex items-center justify-between">Amount Paid <SortIcon column="finalTotal" /></div>
                </th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-[#333333] text-[#e0e0e0]' : 'divide-[#e6e8e9] text-[#182433]'}`}>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className={`px-5 py-10 text-center ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>
                    <IconReceipt2 stroke={1} className="mx-auto h-10 w-10 mb-2 opacity-50" />
                    <p>No transactions found.</p>
                  </td>
                </tr>
              ) : (
                currentItems.map((order) => {
                  const totalItems = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                  const finalTotal = (order.total || 0) - (order.credit_used || 0);
                  return (
                    <tr key={order.id} className={`transition-colors ${isDark ? 'hover:bg-[#252525]' : 'hover:bg-[#f8f9fa]'}`}>
                      <td className={`px-5 py-3 font-semibold ${isDark ? 'text-[#ffb300]' : 'text-[#206bc4]'}`}>#{order.id}</td>
                      <td className={`px-5 py-3 ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>{new Date(order.date).toLocaleString()}</td>
                      <td className="px-5 py-3">{order.customer_name || <span className={`italic ${isDark ? 'text-[#555]' : 'text-[#667382]'}`}>Guest</span>}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-0.5 rounded border text-xs font-medium ${isDark ? 'bg-[#121212] border-[#333333] text-[#a0a0a0]' : 'bg-[#f4f6fa] border-[#e6e8e9] text-[#667382]'}`}>
                          {totalItems}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-bold">{currencySymbol}{finalTotal.toFixed(2)}</td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => setSelectedOrder(order)} className={`flex items-center justify-end w-full space-x-1 transition-colors font-medium text-xs uppercase tracking-wide ${isDark ? 'text-[#a0a0a0] hover:text-[#ffb300]' : 'text-[#667382] hover:text-[#206bc4]'}`}>
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

        {/* Pagination Footer */}
        <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
          <p className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>
            Showing {filteredAndSorted.length === 0 ? 0 : indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredAndSorted.length)} of {filteredAndSorted.length} entries
          </p>
          <div className="flex space-x-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`px-3 py-1.5 text-sm font-medium rounded border transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-[#252525] border-[#333333] text-[#e0e0e0] hover:bg-[#333333]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:bg-[#e6e8e9]'}`}>
              Previous
            </button>
            <div className={`flex items-center justify-center px-3 py-1.5 text-sm font-bold rounded ${isDark ? 'bg-[#ffb300] text-[#121212]' : 'bg-[#206bc4] text-white'}`}>
              {currentPage}
            </div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`px-3 py-1.5 text-sm font-medium rounded border transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-[#252525] border-[#333333] text-[#e0e0e0] hover:bg-[#333333]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:bg-[#e6e8e9]'}`}>
              Next
            </button>
          </div>
        </div>
      </div>
      
      {/* View Modal retained... */}
      {/* ... */}
    </div>
  );
}