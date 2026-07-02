import { useState, useEffect, useMemo, useRef } from 'react';
import { IconPlus, IconPackage, IconTrash, IconPhoto, IconX, IconAlertTriangle, IconFileImport, IconSearch, IconFilter, IconChevronUp, IconChevronDown, IconSelector, IconEdit, IconBoxSeam, IconCalendarEvent, IconHistory, IconBarcode } from '@tabler/icons-react';
import { useToast } from '../contexts/ToastContext';

export default function Inventory({ theme }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({ currency: 'PHP' });
  const [logs, setLogs] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockAmount, setRestockAmount] = useState('');
  
  const [openActionId, setOpenActionId] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState('bottom');
  const [historyProduct, setHistoryProduct] = useState(null);

  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [barcodeQuantity, setBarcodeQuantity] = useState('');
  const [showBarcodePreview, setShowBarcodePreview] = useState(false);

  const [formData, setFormData] = useState({ id: null, name: '', sku: '', price: '', stock: '', category: '', image: '' });
  
  const [dateFilter, setDateFilter] = useState('Today');
  const [specificDate, setSpecificDate] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDragging, setIsDragging] = useState(false);

  const showToast = useToast();
  const isDark = theme === 'dark';

  useEffect(() => { loadProducts(); loadCategories(); loadSettings(); loadLogs(); }, []);

  const loadSettings = async () => {
    if (window.electronAPI) {
       try {
          const sData = await window.electronAPI.getSettings();
          const sObj = {}; 
          sData.forEach(item => sObj[item.key] = item.value);
          setSettings(sObj);
       } catch (e) {}
    }
  }

  const loadLogs = async () => {
    if (window.electronAPI) {
      try { setLogs(await window.electronAPI.getInventoryLogs() || []); } catch (e) {}
    }
  }

  const loadProducts = async () => { if (window.electronAPI) { try { setProducts(await window.electronAPI.getProducts()); } catch (e) {} } };
  const loadCategories = async () => { if (window.electronAPI) { try { const catData = await window.electronAPI.getCategories(); setCategories(catData); } catch (e) {} } };

  const currencySymbol = { USD: '$', EUR: '€', GBP: '£', PHP: '₱' }[settings.currency] || '₱';

  const openAddModal = () => { setIsEditing(false); setFormData({ id: null, name: '', sku: '', price: '', stock: '', category: categories[0]?.name || '', image: '' }); setIsModalOpen(true); };
  const openEditModal = (product) => { setIsEditing(true); setFormData(product); setIsModalOpen(true); };

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
    if (window.electronAPI) {
      try {
        const payload = { id: formData.id, name: formData.name, sku: formData.sku, price: parseFloat(formData.price), stock: parseInt(formData.stock, 10), category: formData.category, image: formData.image };
        if (isEditing) { await window.electronAPI.updateProduct(payload); showToast("Product updated successfully!", "success"); } 
        else { await window.electronAPI.addProduct(payload); showToast("Product added successfully!", "success"); }
        loadProducts(); loadLogs(); setIsModalOpen(false);
      } catch (e) { showToast("Failed to save product. Check SKU.", "error"); }
    }
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    const amount = parseInt(restockAmount, 10);
    if (!amount || amount <= 0) return;
    if (window.electronAPI && restockProduct) {
      try {
        await window.electronAPI.updateStock({ id: restockProduct.id, newStock: restockProduct.stock + amount, productName: restockProduct.name, sku: restockProduct.sku, addedAmount: amount });
        showToast(`Restocked ${amount} units of ${restockProduct.name}.`, "success");
        loadProducts(); loadLogs(); setRestockProduct(null); setRestockAmount('');
      } catch (error) {}
    }
  };

  const executeDelete = async () => { if (window.electronAPI && deleteConfirmId) { try { const p = products.find(i=>i.id===deleteConfirmId); await window.electronAPI.deleteProduct({id: deleteConfirmId, name: p.name, sku: p.sku}); loadProducts(); loadLogs(); setDeleteConfirmId(null); showToast("Product deleted.", "success"); } catch (e) { showToast("Failed to delete product.", "error"); } } };

  const handleBulkImport = async () => { if (window.electronAPI) { try { const result = await window.electronAPI.importCsv(); if (result.success) { showToast(`Successfully imported ${result.count} products!`, 'success'); loadProducts(); loadLogs(); } } catch (e) { showToast("Import failed. Check CSV format.", "error"); } } };

  const requestSort = (key) => { let direction = 'ascending'; if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending'; setSortConfig({ key, direction }); };

  const filteredAndSortedProducts = useMemo(() => {
    let sortableItems = [...products];
    if (searchQuery) { const q = searchQuery.toLowerCase(); sortableItems = sortableItems.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)); }
    if (selectedCategoryFilter !== 'All') sortableItems = sortableItems.filter(p => p.category === selectedCategoryFilter);
    sortableItems.sort((a, b) => { if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1; if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1; return 0; });
    return sortableItems;
  }, [products, searchQuery, selectedCategoryFilter, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSortedProducts.slice(indexOfFirstItem, indexOfLastItem);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [totalPages, currentPage]);

  const handlePrintBarcodes = async () => {
    if (window.electronAPI && barcodeProduct && barcodeQuantity) {
      await window.electronAPI.printBarcodes({ product: barcodeProduct, quantity: parseInt(barcodeQuantity, 10), settings });
      setBarcodeProduct(null);
      setShowBarcodePreview(false);
      setBarcodeQuantity('');
    }
  };

  const handleActionClick = (e, productId) => {
    if (openActionId === productId) {
      setOpenActionId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    
    // If the button is closer to the bottom of the screen than the top, open upwards
    if (windowHeight - rect.bottom < 250) {
      setDropdownPosition('top');
    } else {
      setDropdownPosition('bottom');
    }
    setOpenActionId(productId);
  };

  const inputClass = isDark ? "bg-[#121212] border border-[#333333] rounded-md px-3 py-2 text-[#e0e0e0] text-sm focus:outline-none focus:border-[#ffb300]" : "bg-white border border-[#e6e8e9] rounded-md px-3 py-2 text-[#182433] text-sm focus:outline-none focus:border-[#206bc4]";
  const labelClass = `block text-xs font-semibold mb-1.5 uppercase tracking-wide ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`;
  const thClass = `px-5 py-3 cursor-pointer select-none transition-colors ${isDark ? 'hover:bg-[#252525]' : 'hover:bg-[#e6e8e9]/50'}`;
  const SortIcon = ({ column }) => { if (sortConfig.key !== column) return <IconSelector size={14} className={isDark ? "text-[#555]" : "text-[#a0aab5]"} />; return sortConfig.direction === 'ascending' ? <IconChevronUp size={14} className={isDark ? "text-[#ffb300]" : "text-[#206bc4]"} /> : <IconChevronDown size={14} className={isDark ? "text-[#ffb300]" : "text-[#206bc4]"} />; };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#182433]'}`}>Inventory Directory</h2>
        <div className="flex items-center space-x-3">
          <button onClick={handleBulkImport} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors border ${isDark ? 'bg-[#1a1a1a] border-[#333333] text-[#e0e0e0] hover:border-[#ffb300]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:bg-[#f8f9fa]'}`}>
            <IconFileImport stroke={1.5} size={18} className={`mr-2 ${isDark ? 'text-[#ffb300]' : 'text-[#206bc4]'}`} /> Import CSV
          </button>
          <button onClick={openAddModal} className={`flex items-center text-[#121212] px-4 py-2 rounded-md text-sm font-bold shadow-sm transition-colors ${isDark ? 'bg-[#ffb300] hover:bg-[#d97706]' : 'bg-[#206bc4] text-white hover:bg-[#1d5fb0]'}`}>
            <IconPlus stroke={2} size={18} className="mr-2" /> Add Product
          </button>
        </div>
      </div>

      <div className={`border rounded-md shadow-sm flex flex-col ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
        <div className={`p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-4 ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-white'}`}>
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>Show</span>
            <select value={itemsPerPage} onChange={(e) => {setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}} className={`${inputClass} py-1.5 pr-8`}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667382]"><IconFilter size={16} /></div>
              <select value={selectedCategoryFilter} onChange={(e) => {setSelectedCategoryFilter(e.target.value); setCurrentPage(1);}} className={`${inputClass} pl-9`}><option value="All">All Categories</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667382]"><IconSearch size={16} /></div>
              <input type="text" value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} placeholder="Search products..." className={`${inputClass} pl-9`} />
            </div>
          </div>
        </div>

        {/* Note: The overflow-visible class here ensures the absolute dropdown isn't clipped by the parent container */}
        <div className="w-full overflow-visible min-h-[500px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`text-[11px] uppercase tracking-wider font-semibold border-b ${isDark ? 'bg-[#121212] text-[#a0a0a0] border-[#333333]' : 'bg-[#f8f9fa] text-[#667382] border-[#e6e8e9]'}`}>
              <tr>
                <th className="px-5 py-3 w-10">Img</th>
                <th className={thClass} onClick={() => requestSort('name')}><div className="flex items-center justify-between">Product <SortIcon column="name" /></div></th>
                <th className={thClass} onClick={() => requestSort('category')}><div className="flex items-center justify-between">Category <SortIcon column="category" /></div></th>
                <th className={thClass} onClick={() => requestSort('sku')}><div className="flex items-center justify-between">SKU <SortIcon column="sku" /></div></th>
                <th className={thClass} onClick={() => requestSort('price')}><div className="flex items-center justify-between">Price <SortIcon column="price" /></div></th>
                <th className={thClass} onClick={() => requestSort('stock')}><div className="flex items-center justify-between">Stock <SortIcon column="stock" /></div></th>
                <th className={thClass} onClick={() => requestSort('updated_at')}><div className="flex items-center justify-between">Last Updated <SortIcon column="updated_at" /></div></th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-[#333333] text-[#e0e0e0]' : 'divide-[#e6e8e9] text-[#182433]'}`}>
              {currentItems.length === 0 ? (
                <tr><td colSpan="8" className={`px-5 py-16 text-center ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}><IconPackage stroke={1} className="mx-auto h-12 w-12 mb-3 opacity-50" /><p className={`text-base font-medium ${isDark ? 'text-white' : 'text-[#182433]'}`}>No products found</p></td></tr>
              ) : (
                currentItems.map((product) => (
                  <tr key={product.id} className={`transition-colors ${isDark ? 'hover:bg-[#252525]' : 'hover:bg-[#f8f9fa]'}`}>
                    <td className="px-5 py-3">{product.image ? <img src={product.image} className={`h-10 w-10 rounded border object-cover ${isDark ? 'border-[#333333]' : 'border-[#e6e8e9]'}`} /> : <div className={`h-10 w-10 rounded border flex items-center justify-center ${isDark ? 'bg-[#121212] border-[#333333] text-[#7a7a7a]' : 'bg-[#f4f6fa] border-[#e6e8e9] text-[#667382]'}`}><IconPackage size={20} stroke={1.5} /></div>}</td>
                    <td className="px-5 py-3 font-semibold">{product.name}</td>
                    <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${isDark ? 'bg-[#ffb300]/10 text-[#ffb300]' : 'bg-[#e6f0fa] text-[#206bc4]'}`}>{product.category || 'N/A'}</span></td>
                    <td className={`px-5 py-3 ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>{product.sku}</td>
                    <td className="px-5 py-3 font-medium">{currencySymbol}{product.price.toFixed(2)}</td>
                    <td className="px-5 py-3 font-bold"><span className={product.stock > 10 ? (isDark ? 'text-[#2ba02b]' : 'text-[#2ba02b]') : 'text-[#d63939]'}>{product.stock}</span></td>
                    <td className={`px-5 py-3 text-xs ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>{product.updated_at ? new Date(product.updated_at).toLocaleString() : 'Just now'}</td>
                    <td className="px-5 py-3 text-right relative">
                      <button onClick={(e) => handleActionClick(e, product.id)} className={`inline-flex items-center justify-between px-3 py-1.5 rounded border text-sm font-medium transition-colors ${isDark ? 'bg-[#252525] border-[#333333] text-[#e0e0e0] hover:border-[#ffb300]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:border-[#206bc4]'}`}>
                        <span>Actions</span> <IconChevronDown size={14} className="ml-2" />
                      </button>
                      {openActionId === product.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenActionId(null)}></div>
                          <div className={`absolute right-5 z-50 w-48 rounded-md shadow-2xl py-1 border ${dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} ${isDark ? 'bg-[#252525] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
                            <button onClick={() => { setRestockProduct(product); setOpenActionId(null); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center ${isDark ? 'text-[#e0e0e0] hover:bg-[#333333]' : 'text-[#182433] hover:bg-[#f8f9fa]'}`}>
                              <IconPlus size={16} className="mr-3 text-[#2ba02b]" /> Add Stocks
                            </button>
                            <button onClick={() => { openEditModal(product); setOpenActionId(null); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center ${isDark ? 'text-[#e0e0e0] hover:bg-[#333333]' : 'text-[#182433] hover:bg-[#f8f9fa]'}`}>
                              <IconEdit size={16} className="mr-3 text-[#206bc4]" /> Edit Product
                            </button>
                            <button onClick={() => { setHistoryProduct(product); setOpenActionId(null); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center ${isDark ? 'text-[#e0e0e0] hover:bg-[#333333]' : 'text-[#182433] hover:bg-[#f8f9fa]'}`}>
                              <IconHistory size={16} className="mr-3 text-[#ffb300]" /> View History
                            </button>
                            <div className={`my-1 border-t ${isDark ? 'border-[#333333]' : 'border-[#e6e8e9]'}`}></div>
                            <button onClick={() => { setBarcodeProduct(product); setOpenActionId(null); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center ${isDark ? 'text-[#e0e0e0] hover:bg-[#333333]' : 'text-[#182433] hover:bg-[#f8f9fa]'}`}>
                              <IconBarcode size={16} className="mr-3 text-[#6f42c1]" /> Print Barcodes
                            </button>
                            <div className={`my-1 border-t ${isDark ? 'border-[#333333]' : 'border-[#e6e8e9]'}`}></div>
                            <button onClick={() => { setDeleteConfirmId(product.id); setOpenActionId(null); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center font-semibold ${isDark ? 'text-[#d63939] hover:bg-[#333333]' : 'text-[#d63939] hover:bg-[#f8f9fa]'}`}>
                              <IconTrash size={16} className="mr-3" /> Delete Item
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
          <p className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>Showing {filteredAndSortedProducts.length === 0 ? 0 : indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredAndSortedProducts.length)} of {filteredAndSortedProducts.length} entries</p>
          <div className="flex space-x-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`px-3 py-1.5 text-sm font-medium rounded border transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-[#252525] border-[#333333] text-[#e0e0e0] hover:bg-[#333333]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:bg-[#e6e8e9]'}`}>Previous</button>
            <div className={`flex items-center justify-center px-3 py-1.5 text-sm font-bold rounded ${isDark ? 'bg-[#ffb300] text-[#121212]' : 'bg-[#206bc4] text-white'}`}>{currentPage}</div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`px-3 py-1.5 text-sm font-medium rounded border transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-[#252525] border-[#333333] text-[#e0e0e0] hover:bg-[#333333]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:bg-[#e6e8e9]'}`}>Next</button>
          </div>
        </div>
      </div>

      {historyProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#121212]/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1e1e1e] border border-[#333333]' : 'bg-white'}`}>
            <div className={`px-6 py-4 flex justify-between items-center border-b ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
              <h3 className={`font-bold text-lg flex items-center ${isDark ? 'text-white' : 'text-[#182433]'}`}>
                 <IconHistory className="mr-2" stroke={1.5} />
                 Product History: {historyProduct.name}
              </h3>
              <button onClick={() => setHistoryProduct(null)} className={`p-1 transition-colors ${isDark ? 'text-[#a0a0a0] hover:text-[#d63939]' : 'text-[#667382] hover:text-[#d63939]'}`}><IconX stroke={2} size={20} /></button>
            </div>
            <div className={`flex-1 overflow-y-auto p-0 ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
              <table className="w-full text-left text-sm">
                <thead className={`text-[10px] font-black uppercase tracking-widest border-b sticky top-0 z-10 ${isDark ? 'bg-[#121212] text-[#a0a0a0] border-[#333333]' : 'bg-[#f8f9fa] text-[#667382] border-[#e6e8e9]'}`}>
                  <tr>
                    <th className="px-5 py-3 bg-inherit">Date & Time</th>
                    <th className="px-5 py-3 bg-inherit">Action</th>
                    <th className="px-5 py-3 bg-inherit text-right">Quantity Change</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-[#333333] text-[#e0e0e0]' : 'divide-[#e6e8e9] text-[#182433]'}`}>
                  {logs.filter(l => l.sku === historyProduct.sku || l.product_name === historyProduct.name).length === 0 ? (
                    <tr><td colSpan="3" className="px-5 py-8 text-center text-xs opacity-50">No history records found.</td></tr>
                  ) : logs.filter(l => l.sku === historyProduct.sku || l.product_name === historyProduct.name).map((log, idx) => (
                    <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-[#252525]' : 'hover:bg-[#f8f9fa]'}`}>
                      <td className="px-5 py-3">{new Date(log.date).toLocaleString()}</td>
                      <td className={`px-5 py-3 font-bold ${log.action === 'Created' || log.action === 'Imported' ? (isDark?'text-[#ffb300]':'text-[#206bc4]') : log.action.includes('Restock') ? 'text-[#2ba02b]' : log.action === 'Sale' ? (isDark?'text-[#a0a0a0]':'text-[#667382]') : log.action === 'Deleted' ? 'text-[#d63939]' : ''}`}>{log.action}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${log.quantity > 0 ? 'bg-[#2ba02b]/10 text-[#2ba02b]' : log.quantity < 0 ? 'bg-[#d63939]/10 text-[#d63939]' : (isDark ? 'bg-[#333] text-[#a0a0a0]' : 'bg-[#e6e8e9] text-[#667382]')}`}>
                          {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`px-6 py-4 flex justify-end border-t ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
               <button onClick={() => setHistoryProduct(null)} className={`px-6 py-2.5 rounded-md text-sm font-bold shadow-sm transition-colors ${isDark ? 'bg-[#ffb300] text-[#121212] hover:bg-[#d97706]' : 'bg-[#206bc4] text-white hover:bg-[#1d5fb0]'}`}>Close History</button>
            </div>
          </div>
        </div>
      )}

      {barcodeProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#121212]/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1e1e1e] border border-[#333333]' : 'bg-white'}`}>
            <div className={`px-6 py-4 flex justify-between items-center border-b ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
               <h3 className={`font-bold text-lg flex items-center ${isDark ? 'text-white' : 'text-[#182433]'}`}><IconBarcode className="mr-2" stroke={1.5} /> Generate Barcodes</h3>
               <button onClick={() => { setBarcodeProduct(null); setShowBarcodePreview(false); setBarcodeQuantity(''); }} className={`p-1 transition-colors ${isDark ? 'text-[#a0a0a0] hover:text-[#d63939]' : 'text-[#667382] hover:text-[#d63939]'}`}><IconX stroke={2} size={20} /></button>
            </div>
            {!showBarcodePreview ? (
              <form onSubmit={(e) => { e.preventDefault(); if (barcodeQuantity > 0) setShowBarcodePreview(true); }}>
                <div className="p-8">
                   <p className={`text-sm mb-4 ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>Specify the number of barcode labels you want to generate for <strong>{barcodeProduct.name}</strong> (SKU: {barcodeProduct.sku}).</p>
                   <label className={labelClass}>Quantity</label>
                   <input type="number" required min="1" max="500" value={barcodeQuantity} onChange={(e) => setBarcodeQuantity(e.target.value)} className={inputClass} placeholder="e.g. 50" autoFocus />
                </div>
                <div className={`px-6 py-4 flex justify-end space-x-3 border-t ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
                  <button type="button" onClick={() => { setBarcodeProduct(null); setBarcodeQuantity(''); }} className={`px-5 py-2.5 text-sm font-bold rounded-md transition-colors ${isDark ? 'text-[#a0a0a0] hover:bg-[#333333]' : 'text-[#667382] hover:bg-[#e6e8e9]'}`}>Cancel</button>
                  <button type="submit" className="px-6 py-2.5 rounded-md text-sm font-bold text-white bg-[#6f42c1] shadow-sm hover:bg-[#59339e] transition-colors">Generate Preview</button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col">
                <div className={`p-8 max-h-[300px] overflow-y-auto grid grid-cols-2 gap-4 ${isDark ? 'bg-[#121212]' : 'bg-[#f4f6fa]'}`}>
                   {Array.from({ length: Math.min(barcodeQuantity, 20) }).map((_, i) => (
                      <div key={i} className={`p-3 border rounded shadow-sm flex flex-col items-center justify-center bg-white border-[#e6e8e9]`}>
                         <img src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${barcodeProduct.sku}&scale=2&includetext`} alt="Barcode" className="max-w-full h-auto" />
                         <span className="text-[10px] text-gray-500 mt-1 truncate w-full text-center">{barcodeProduct.name}</span>
                      </div>
                   ))}
                   {barcodeQuantity > 20 && <div className="col-span-2 text-center text-xs opacity-50 py-2">... and {barcodeQuantity - 20} more labels.</div>}
                </div>
                <div className={`px-6 py-4 flex justify-end space-x-3 border-t ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
                  <button type="button" onClick={() => setShowBarcodePreview(false)} className={`px-5 py-2.5 text-sm font-bold rounded-md transition-colors ${isDark ? 'text-[#a0a0a0] hover:bg-[#333333]' : 'text-[#667382] hover:bg-[#e6e8e9]'}`}>Back</button>
                  <button onClick={handlePrintBarcodes} className="px-6 py-2.5 rounded-md text-sm font-bold text-white bg-[#206bc4] shadow-sm hover:bg-[#1d5fb0] transition-colors flex items-center"><IconPrinter size={18} className="mr-2" /> Print to PDF</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121212]/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`rounded-xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1e1e1e] border border-[#333333]' : 'bg-white'}`}>
            <div className={`px-8 py-5 flex justify-between items-center border-b ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
               <h3 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-[#182433]'}`}>{isEditing ? 'Edit Product Configuration' : 'New Product Report'}</h3>
               <button onClick={() => setIsModalOpen(false)} className={`p-1 transition-colors ${isDark ? 'text-[#a0a0a0] hover:text-[#d63939]' : 'text-[#667382] hover:text-[#d63939]'}`}><IconX stroke={2} size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1">
               <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-5">
                     <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-2"><label className={labelClass}>Product Name</label><input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={inputClass} /></div>
                        <div><label className={labelClass}>SKU Code</label><input type="text" required value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} className={inputClass} /></div>
                        <div><label className={labelClass}>Category</label><select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className={inputClass}>{categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}</select></div>
                        <div><label className={labelClass}>Unit Price ({currencySymbol})</label><input type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className={inputClass} /></div>
                        <div>
                          <label className={labelClass}>{isEditing ? 'Locked Stock' : 'Initial Stock'}</label>
                          <input type="number" required value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})} className={`${inputClass} ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`} readOnly={isEditing} />
                        </div>
                     </div>
                  </div>
                  <div className="md:col-span-1 flex flex-col">
                     <label className={labelClass}>Product Image</label>
                     <div onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={handleImageSelect} className={`flex-1 min-h-[220px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${isDragging ? (isDark ? 'border-[#ffb300] bg-[#ffb300]/10' : 'border-[#206bc4] bg-[#e6f0fa]') : (isDark ? 'border-[#333333] bg-[#121212] hover:border-[#555]' : 'border-[#e6e8e9] bg-[#f8f9fa] hover:border-[#dce1e7]')}`}>
                       {formData.image ? <div className="p-2 w-full h-full relative group"><img src={formData.image} className="w-full h-full object-cover rounded-lg shadow-sm" /><div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"><span className="text-white text-sm font-bold">Change Image</span></div></div> : <div className="text-center p-6 pointer-events-none"><div className={`mx-auto w-12 h-12 mb-3 rounded-full flex items-center justify-center shadow-sm ${isDark ? 'bg-[#252525] text-[#a0a0a0]' : 'bg-white text-[#667382]'}`}><IconPhoto size={24} stroke={1.5} /></div><p className={`text-sm font-bold ${isDark ? 'text-[#e0e0e0]' : 'text-[#182433]'}`}>Click or drop image</p></div>}
                     </div>
                  </div>
               </div>
               <div className={`px-8 py-5 border-t flex justify-end space-x-3 ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className={`px-5 py-2.5 text-sm font-bold rounded-md transition-colors ${isDark ? 'text-[#a0a0a0] hover:bg-[#333333]' : 'text-[#667382] hover:bg-[#e6e8e9]'}`}>Cancel</button>
                  <button type="submit" className={`px-6 py-2.5 rounded-md text-sm font-bold shadow-sm transition-colors flex items-center ${isDark ? 'bg-[#ffb300] text-[#121212] hover:bg-[#d97706]' : 'bg-[#206bc4] text-white hover:bg-[#1d5fb0]'}`}>{isEditing ? 'Save Changes' : <><IconPlus size={18} stroke={2} className="mr-2" /> Create Product</>}</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#121212]/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className={`rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden text-center animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1e1e1e] border border-[#333333]' : 'bg-white'}`}>
             <div className="p-6">
                <div className="mx-auto w-12 h-12 mb-4 bg-[#d63939]/10 text-[#d63939] rounded-full flex items-center justify-center"><IconAlertTriangle size={24} stroke={2} /></div>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-[#182433]'}`}>Are you sure?</h3>
             </div>
             <div className={`flex border-t ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
                <button onClick={() => setDeleteConfirmId(null)} className={`flex-1 py-3 text-sm font-medium border-r transition-colors ${isDark ? 'border-[#333333] text-[#a0a0a0] hover:text-white hover:bg-[#333333]' : 'border-[#e6e8e9] text-[#667382] hover:text-[#182433] hover:bg-[#e6e8e9]/50'}`}>Cancel</button>
                <button onClick={executeDelete} className="flex-1 py-3 text-sm font-bold text-[#d63939] hover:bg-[#d63939]/10 transition-colors">Delete</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}