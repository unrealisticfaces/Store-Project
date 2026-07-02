import { useState, useEffect, useMemo } from 'react';
import { IconClipboardList, IconSearch, IconChevronUp, IconChevronDown, IconSelector, IconFileDownload, IconCalendarEvent, IconPackage, IconBoxSeam } from '@tabler/icons-react';
import { useToast } from '../contexts/ToastContext';

export default function InventoryLogs({ theme }) {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  
  const [dateFilter, setDateFilter] = useState('Today');
  const [specificDate, setSpecificDate] = useState('');

  const showToast = useToast();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getInventoryLogs().then(data => setLogs(data)).catch(() => {});
    }
  }, []);

  const handleExportCSV = async () => {
    if (logs.length === 0) return;
    if (window.electronAPI) {
      const success = await window.electronAPI.exportLogsCsv();
      if (success) showToast("Audit Logs Exported Successfully!", "success");
    }
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  const filteredAndSortedLogs = useMemo(() => {
    let sortableItems = [...logs];
    
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
      
      sortableItems = sortableItems.filter(l => {
        const d = new Date(l.date);
        return d >= start && d <= end;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      sortableItems = sortableItems.filter(l => l.product_name.toLowerCase().includes(q) || (l.sku && l.sku.toLowerCase().includes(q)) || l.action.toLowerCase().includes(q));
    }
    
    sortableItems.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
    return sortableItems;
  }, [logs, searchQuery, sortConfig, dateFilter, specificDate]);

  const { itemsAdded, unitsRestocked, topAdditions } = useMemo(() => {
    let added = 0;
    let restocked = 0;
    const productMap = {};

    filteredAndSortedLogs.forEach(l => {
      if (l.action === 'Created' || l.action === 'Imported') {
        added++;
        productMap[l.product_name] = (productMap[l.product_name] || 0) + l.quantity;
      }
      if (l.action === 'Restock' || l.action === 'Refund Restock') {
        restocked += l.quantity;
        productMap[l.product_name] = (productMap[l.product_name] || 0) + l.quantity;
      }
    });

    const sortedAdditions = Object.entries(productMap).sort((a,b) => b[1]-a[1]).slice(0, 5);

    return { itemsAdded: added, unitsRestocked: restocked, topAdditions: sortedAdditions };
  }, [filteredAndSortedLogs]);

  const totalPages = Math.ceil(filteredAndSortedLogs.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSortedLogs.slice(indexOfFirstItem, indexOfLastItem);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [totalPages, currentPage]);

  const inputClass = isDark ? "bg-[#121212] border border-[#333333] rounded-md px-3 py-2 text-[#e0e0e0] text-sm focus:outline-none focus:border-[#ffb300]" : "bg-white border border-[#e6e8e9] rounded-md px-3 py-2 text-[#182433] text-sm focus:outline-none focus:border-[#206bc4]";
  const thClass = `px-5 py-3 cursor-pointer select-none transition-colors ${isDark ? 'hover:bg-[#252525]' : 'hover:bg-[#e6e8e9]/50'}`;
  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <IconSelector size={14} className={isDark ? "text-[#555]" : "text-[#a0aab5]"} />;
    return sortConfig.direction === 'ascending' ? <IconChevronUp size={14} className={isDark ? "text-[#ffb300]" : "text-[#206bc4]"} /> : <IconChevronDown size={14} className={isDark ? "text-[#ffb300]" : "text-[#206bc4]"} />;
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'Created': return isDark ? 'text-[#ffb300]' : 'text-[#206bc4]';
      case 'Restock': return 'text-[#2ba02b]';
      case 'Sale': return isDark ? 'text-[#a0a0a0]' : 'text-[#667382]';
      case 'Refund Restock': return isDark ? 'text-[#ffb300]' : 'text-[#f59f00]';
      case 'Deleted': return 'text-[#d63939]';
      default: return isDark ? 'text-[#e0e0e0]' : 'text-[#182433]';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#182433]'}`}>Stock Activity Log</h2>
        <button onClick={handleExportCSV} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors border ${isDark ? 'bg-[#1a1a1a] border-[#333333] text-[#e0e0e0] hover:border-[#ffb300]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:bg-[#f8f9fa]'}`}>
          <IconFileDownload stroke={1.5} size={18} className={`mr-2 ${isDark ? 'text-[#ffb300]' : 'text-[#206bc4]'}`} /> Export Logs
        </button>
      </div>

      <div className={`p-4 rounded-md shadow-sm border flex flex-col md:flex-row items-center justify-between gap-4 ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="flex flex-col gap-6">
            <div className={`p-5 rounded-md shadow-sm border flex items-center space-x-4 ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
              <div className={`p-3 rounded-md ${isDark ? 'bg-[#2ba02b]/20 text-[#2ba02b]' : 'bg-[#2ba02b]/10 text-[#2ba02b]'}`}><IconPackage size={24} stroke={1.5} /></div>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>Items Added</p>
                <h3 className={`text-2xl font-bold leading-none ${isDark ? 'text-white' : 'text-[#182433]'}`}>{itemsAdded}</h3>
              </div>
            </div>
            <div className={`p-5 rounded-md shadow-sm border flex items-center space-x-4 ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
              <div className={`p-3 rounded-md ${isDark ? 'bg-[#206bc4]/20 text-[#206bc4]' : 'bg-[#206bc4]/10 text-[#206bc4]'}`}><IconBoxSeam size={24} stroke={1.5} /></div>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>Units Restocked</p>
                <h3 className={`text-2xl font-bold leading-none ${isDark ? 'text-white' : 'text-[#182433]'}`}>{unitsRestocked}</h3>
              </div>
            </div>
         </div>

         <div className={`md:col-span-2 border rounded-md shadow-sm flex flex-col ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
            <div className={`p-4 border-b ${isDark ? 'border-[#333333]' : 'border-[#e6e8e9]'}`}>
               <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-[#182433]'}`}>Inventory Acquisitions</h3>
            </div>
            <div className="overflow-x-auto flex-1">
               <table className="w-full text-sm text-left">
                  <thead className={`text-[10px] uppercase tracking-widest font-semibold border-b ${isDark ? 'bg-[#121212] text-[#a0a0a0] border-[#333333]' : 'bg-[#f8f9fa] text-[#667382] border-[#e6e8e9]'}`}>
                     <tr>
                        <th className="px-5 py-3">Product</th>
                        <th className="px-5 py-3 text-right">Volume</th>
                     </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-[#333333] text-[#e0e0e0]' : 'divide-[#e6e8e9] text-[#182433]'}`}>
                     {topAdditions.length === 0 ? (
                        <tr><td colSpan="2" className="px-5 py-8 text-center text-xs opacity-50">No stock acquisitions recorded.</td></tr>
                     ) : topAdditions.map((item, idx) => (
                        <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-[#252525]' : 'hover:bg-[#f8f9fa]'}`}>
                           <td className="px-5 py-3 font-medium">{item[0]}</td>
                           <td className="px-5 py-3 text-right font-bold text-[#2ba02b]">+{item[1]}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>

      <div className={`border rounded-md shadow-sm overflow-hidden flex flex-col ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
        <div className={`p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-4 ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-white'}`}>
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>Show</span>
            <select value={itemsPerPage} onChange={(e) => {setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}} className={`${inputClass} py-1.5 pr-8`}><option value={15}>15</option><option value={50}>50</option><option value={100}>100</option></select>
          </div>
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667382]"><IconSearch size={16} /></div>
            <input type="text" value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} placeholder="Search logs or SKU..." className={`${inputClass} pl-9`} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`text-[11px] uppercase tracking-wider font-semibold border-b ${isDark ? 'bg-[#121212] text-[#a0a0a0] border-[#333333]' : 'bg-[#f8f9fa] text-[#667382] border-[#e6e8e9]'}`}>
              <tr>
                <th className={thClass} onClick={() => requestSort('date')}><div className="flex items-center justify-between">Date & Time <SortIcon column="date" /></div></th>
                <th className={thClass} onClick={() => requestSort('product_name')}><div className="flex items-center justify-between">Product <SortIcon column="product_name" /></div></th>
                <th className={thClass} onClick={() => requestSort('sku')}><div className="flex items-center justify-between">SKU <SortIcon column="sku" /></div></th>
                <th className={thClass} onClick={() => requestSort('action')}><div className="flex items-center justify-between">Action <SortIcon column="action" /></div></th>
                <th className={thClass} onClick={() => requestSort('quantity')}><div className="flex items-center justify-between">Variance <SortIcon column="quantity" /></div></th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-[#333333] text-[#e0e0e0]' : 'divide-[#e6e8e9] text-[#182433]'}`}>
              {currentItems.length === 0 ? (
                <tr><td colSpan="5" className={`px-5 py-16 text-center ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}><IconClipboardList stroke={1} className="mx-auto h-12 w-12 mb-3 opacity-50" /><p className={`text-base font-medium ${isDark ? 'text-white' : 'text-[#182433]'}`}>No logs recorded for this period.</p></td></tr>
              ) : (
                currentItems.map((log) => (
                  <tr key={log.id} className={`transition-colors ${isDark ? 'hover:bg-[#252525]' : 'hover:bg-[#f8f9fa]'}`}>
                    <td className={`px-5 py-3 ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>{new Date(log.date).toLocaleString()}</td>
                    <td className="px-5 py-3 font-semibold">{log.product_name}</td>
                    <td className={`px-5 py-3 ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>{log.sku || 'N/A'}</td>
                    <td className={`px-5 py-3 font-bold ${getActionColor(log.action)}`}>{log.action}</td>
                    <td className="px-5 py-3 font-medium">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${log.quantity > 0 ? (isDark ? 'bg-[#2ba02b]/10 text-[#2ba02b]' : 'bg-[#2ba02b]/10 text-[#2ba02b]') : log.quantity < 0 ? 'bg-[#d63939]/10 text-[#d63939]' : (isDark ? 'bg-[#333] text-[#a0a0a0]' : 'bg-[#e6e8e9] text-[#667382]')}`}>
                        {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
          <p className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>Showing {filteredAndSortedLogs.length === 0 ? 0 : indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredAndSortedLogs.length)} of {filteredAndSortedLogs.length} entries</p>
          <div className="flex space-x-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`px-3 py-1.5 text-sm font-medium rounded border transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-[#252525] border-[#333333] text-[#e0e0e0] hover:bg-[#333333]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:bg-[#e6e8e9]'}`}>Previous</button>
            <div className={`flex items-center justify-center px-3 py-1.5 text-sm font-bold rounded ${isDark ? 'bg-[#ffb300] text-[#121212]' : 'bg-[#206bc4] text-white'}`}>{currentPage}</div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`px-3 py-1.5 text-sm font-medium rounded border transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-[#252525] border-[#333333] text-[#e0e0e0] hover:bg-[#333333]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:bg-[#e6e8e9]'}`}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}