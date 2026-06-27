import { useState, useEffect, useMemo } from 'react';
import { IconPlus, IconPackage, IconTrash, IconMinus, IconPhoto, IconX, IconAlertTriangle, IconFileImport, IconSearch, IconFilter, IconChevronUp, IconChevronDown, IconSelector } from '@tabler/icons-react';
import { useToast } from '../contexts/ToastContext';

export default function Inventory({ theme }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [formData, setFormData] = useState({ name: '', sku: '', price: '', stock: '', category: '', image: '' });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [isDragging, setIsDragging] = useState(false);

  const showToast = useToast();
  const isDark = theme === 'dark';

  useEffect(() => { 
    loadProducts(); 
    loadCategories(); 
  }, []);

  const loadProducts = async () => {
    if (window.electronAPI) {
      try { setProducts(await window.electronAPI.getProducts()); } catch (error) {}
    }
  };

  const loadCategories = async () => {
    if (window.electronAPI) {
      try {
        const catData = await window.electronAPI.getCategories();
        setCategories(catData);
        if (catData.length > 0) setFormData(prev => ({ ...prev, category: catData[0].name }));
      } catch (error) {}
    }
  };

  const handleImageSelect = async () => {
    if (window.electronAPI) {
      const imagePath = await window.electronAPI.selectImage();
      if (imagePath) setFormData({ ...formData, image: imagePath });
    }
  };

  // --- FIXED DRAG AND DROP HANDLERS ---
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file && file.path && window.electronAPI) {
        const imagePath = await window.electronAPI.processDroppedImage(file.path);
        if (imagePath) setFormData({ ...formData, image: imagePath });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (window.electronAPI) {
      try {
        await window.electronAPI.addProduct({
          name: formData.name, sku: formData.sku,
          price: parseFloat(formData.price), stock: parseInt(formData.stock, 10),
          category: formData.category, image: formData.image
        });
        loadProducts();
        setIsAddModalOpen(false);
        setFormData({ name: '', sku: '', price: '', stock: '', category: categories[0]?.name || '', image: '' });
        showToast("Product added successfully!", "success");
      } catch (error) { showToast("Failed to add product or SKU already exists.", "error"); }
    }
  };

  const executeDelete = async () => {
    if (window.electronAPI && deleteConfirmId) {
      try {
        await window.electronAPI.deleteProduct(deleteConfirmId);
        loadProducts();
        setDeleteConfirmId(null);
        showToast("Product deleted.", "success");
      } catch (error) { showToast("Failed to delete product.", "error"); }
    }
  };

  const handleUpdateStock = async (id, currentStock, change) => {
    const newStock = currentStock + change;
    if (newStock < 0) return;
    if (window.electronAPI) {
      try { await window.electronAPI.updateStock({ id, newStock }); loadProducts(); } catch (error) {}
    }
  };

  const handleBulkImport = async () => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.importCsv();
        if (result.success) {
          showToast(`Successfully imported ${result.count} products!`, 'success');
          loadProducts();
        }
      } catch (error) { showToast("Import failed. Check your CSV format.", "error"); }
    }
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  const filteredAndSortedProducts = useMemo(() => {
    let sortableItems = [...products];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      sortableItems = sortableItems.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    if (selectedCategoryFilter !== 'All') {
      sortableItems = sortableItems.filter(p => p.category === selectedCategoryFilter);
    }
    sortableItems.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
    return sortableItems;
  }, [products, searchQuery, selectedCategoryFilter, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSortedProducts.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [totalPages, currentPage]);

  const inputClass = isDark ? "bg-[#121212] border border-[#333333] rounded-md px-3 py-2 text-[#e0e0e0] text-sm focus:outline-none focus:border-[#ffb300]" : "bg-white border border-[#e6e8e9] rounded-md px-3 py-2 text-[#182433] text-sm focus:outline-none focus:border-[#206bc4]";
  const labelClass = `block text-xs font-semibold mb-1.5 uppercase tracking-wide ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`;
  const thClass = `px-5 py-3 cursor-pointer select-none transition-colors ${isDark ? 'hover:bg-[#252525]' : 'hover:bg-[#e6e8e9]/50'}`;
  
  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <IconSelector size={14} className={isDark ? "text-[#555]" : "text-[#a0aab5]"} />;
    return sortConfig.direction === 'ascending' ? <IconChevronUp size={14} className={isDark ? "text-[#ffb300]" : "text-[#206bc4]"} /> : <IconChevronDown size={14} className={isDark ? "text-[#ffb300]" : "text-[#206bc4]"} />;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#182433]'}`}>Inventory Management</h2>
        <div className="flex items-center space-x-3">
          <button onClick={handleBulkImport} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors border ${isDark ? 'bg-[#1a1a1a] border-[#333333] text-[#e0e0e0] hover:border-[#ffb300]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:bg-[#f8f9fa]'}`}>
            <IconFileImport stroke={1.5} size={18} className={`mr-2 ${isDark ? 'text-[#ffb300]' : 'text-[#206bc4]'}`} /> Import CSV
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className={`flex items-center text-[#121212] px-4 py-2 rounded-md text-sm font-bold shadow-sm transition-colors ${isDark ? 'bg-[#ffb300] hover:bg-[#d97706]' : 'bg-[#206bc4] text-white hover:bg-[#1d5fb0]'}`}>
            <IconPlus stroke={2} size={18} className="mr-2" /> Add Product
          </button>
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
            <span className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>entries</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667382]"><IconFilter size={16} /></div>
              <select value={selectedCategoryFilter} onChange={(e) => {setSelectedCategoryFilter(e.target.value); setCurrentPage(1);}} className={`${inputClass} pl-9`}>
                <option value="All">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667382]"><IconSearch size={16} /></div>
              <input type="text" value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} placeholder="Search products..." className={`${inputClass} pl-9`} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`text-[11px] uppercase tracking-wider font-bold border-b ${isDark ? 'bg-[#121212] text-[#a0a0a0] border-[#333333]' : 'bg-[#f8f9fa] text-[#667382] border-[#e6e8e9]'}`}>
              <tr>
                <th className="px-5 py-3 w-10">Img</th>
                <th className={thClass} onClick={() => requestSort('name')}><div className="flex items-center justify-between">Product Name <SortIcon column="name" /></div></th>
                <th className={thClass} onClick={() => requestSort('category')}><div className="flex items-center justify-between">Category <SortIcon column="category" /></div></th>
                <th className={thClass} onClick={() => requestSort('sku')}><div className="flex items-center justify-between">SKU <SortIcon column="sku" /></div></th>
                <th className={thClass} onClick={() => requestSort('price')}><div className="flex items-center justify-between">Price <SortIcon column="price" /></div></th>
                <th className={thClass} onClick={() => requestSort('stock')}><div className="flex items-center justify-between">Stock <SortIcon column="stock" /></div></th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-[#333333] text-[#e0e0e0]' : 'divide-[#e6e8e9] text-[#182433]'}`}>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className={`px-5 py-16 text-center ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>
                    <IconPackage stroke={1} className="mx-auto h-12 w-12 mb-3 opacity-50" />
                    <p className={`text-base font-medium ${isDark ? 'text-white' : 'text-[#182433]'}`}>No products found</p>
                  </td>
                </tr>
              ) : (
                currentItems.map((product) => (
                  <tr key={product.id} className={`transition-colors group ${isDark ? 'hover:bg-[#252525]' : 'hover:bg-[#f8f9fa]'}`}>
                    <td className="px-5 py-3">
                      {product.image ? (
                        <img src={product.image} className={`h-10 w-10 rounded border object-cover ${isDark ? 'border-[#333333]' : 'border-[#e6e8e9]'}`} alt="" />
                      ) : (
                        <div className={`h-10 w-10 rounded border flex items-center justify-center ${isDark ? 'bg-[#121212] border-[#333333] text-[#7a7a7a]' : 'bg-[#f4f6fa] border-[#e6e8e9] text-[#667382]'}`}><IconPackage size={20} stroke={1.5} /></div>
                      )}
                    </td>
                    <td className="px-5 py-3 font-semibold">{product.name}</td>
                    <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${isDark ? 'bg-[#ffb300]/10 text-[#ffb300]' : 'bg-[#e6f0fa] text-[#206bc4]'}`}>{product.category || 'N/A'}</span></td>
                    <td className={`px-5 py-3 ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>{product.sku}</td>
                    <td className="px-5 py-3 font-medium">${product.price.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center space-x-3">
                        <button onClick={() => handleUpdateStock(product.id, product.stock, -1)} className={`transition-colors ${isDark ? 'text-[#a0a0a0] hover:text-[#d63939]' : 'text-[#667382] hover:text-[#d63939]'}`}><IconMinus stroke={2} size={16} /></button>
                        <span className={`w-8 text-center font-bold ${product.stock > 10 ? (isDark ? 'text-[#2ba02b]' : 'text-[#2ba02b]') : 'text-[#d63939]'}`}>{product.stock}</span>
                        <button onClick={() => handleUpdateStock(product.id, product.stock, 1)} className={`transition-colors ${isDark ? 'text-[#a0a0a0] hover:text-[#2ba02b]' : 'text-[#667382] hover:text-[#2ba02b]'}`}><IconPlus stroke={2} size={16} /></button>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => setDeleteConfirmId(product.id)} className={`p-1 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 ${isDark ? 'text-[#a0a0a0] hover:text-[#d63939]' : 'text-[#667382] hover:text-[#d63939]'}`}><IconTrash stroke={1.5} size={18} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
          <p className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>
            Showing {filteredAndSortedProducts.length === 0 ? 0 : indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredAndSortedProducts.length)} of {filteredAndSortedProducts.length} entries
          </p>
          <div className="flex space-x-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`px-3 py-1.5 text-sm font-medium rounded border transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-[#252525] border-[#333333] text-[#e0e0e0] hover:bg-[#333333]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:bg-[#e6e8e9]'}`}>Previous</button>
            <div className={`flex items-center justify-center px-3 py-1.5 text-sm font-bold rounded ${isDark ? 'bg-[#ffb300] text-[#121212]' : 'bg-[#206bc4] text-white'}`}>{currentPage}</div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`px-3 py-1.5 text-sm font-medium rounded border transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-[#252525] border-[#333333] text-[#e0e0e0] hover:bg-[#333333]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:bg-[#e6e8e9]'}`}>Next</button>
          </div>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121212]/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`rounded-xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1e1e1e] border border-[#333333]' : 'bg-white'}`}>
            
            <div className={`px-8 py-5 flex justify-between items-center border-b ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
               <h3 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-[#182433]'}`}>New Product Report</h3>
               <button onClick={() => setIsAddModalOpen(false)} className={`p-1 transition-colors ${isDark ? 'text-[#a0a0a0] hover:text-[#d63939]' : 'text-[#667382] hover:text-[#d63939]'}`}><IconX stroke={2} size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1">
               <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                  
                  <div className="md:col-span-2 space-y-5">
                     <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-2">
                          <label className={labelClass}>Product Name</label>
                          <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder="e.g. Mechanical Keyboard" />
                        </div>
                        <div>
                          <label className={labelClass}>SKU Code</label>
                          <input type="text" required value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} className={inputClass} placeholder="e.g. MK-001" />
                        </div>
                        <div>
                          <label className={labelClass}>Category</label>
                          <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className={inputClass}>
                            {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Unit Price ($)</label>
                          <input type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className={inputClass} placeholder="0.00" />
                        </div>
                        <div>
                          <label className={labelClass}>Initial Stock</label>
                          <input type="number" required value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})} className={inputClass} placeholder="0" />
                        </div>
                     </div>
                  </div>

                  <div className="md:col-span-1 flex flex-col">
                     <label className={labelClass}>Product Image</label>
                     <div 
                       onDragEnter={handleDragEnter}
                       onDragOver={handleDragOver} 
                       onDragLeave={handleDragLeave} 
                       onDrop={handleDrop}
                       onClick={handleImageSelect}
                       className={`flex-1 min-h-[220px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                         isDragging 
                           ? (isDark ? 'border-[#ffb300] bg-[#ffb300]/10' : 'border-[#206bc4] bg-[#e6f0fa]')
                           : (isDark ? 'border-[#333333] bg-[#121212] hover:border-[#555]' : 'border-[#e6e8e9] bg-[#f8f9fa] hover:border-[#dce1e7]')
                       }`}
                     >
                       {formData.image ? (
                          <div className="p-2 w-full h-full relative group">
                            <img src={formData.image} alt="Preview" className="w-full h-full object-cover rounded-lg shadow-sm" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <span className="text-white text-sm font-bold">Change Image</span>
                            </div>
                          </div>
                       ) : (
                          <div className="text-center p-6 pointer-events-none">
                             <div className={`mx-auto w-12 h-12 mb-3 rounded-full flex items-center justify-center shadow-sm ${isDark ? 'bg-[#252525] text-[#a0a0a0]' : 'bg-white text-[#667382]'}`}>
                                <IconPhoto size={24} stroke={1.5} />
                             </div>
                             <p className={`text-sm font-bold ${isDark ? 'text-[#e0e0e0]' : 'text-[#182433]'}`}>Click or drop image</p>
                             <p className={`text-xs mt-1 ${isDark ? 'text-[#7a7a7a]' : 'text-[#667382]'}`}>Any local image file</p>
                          </div>
                       )}
                     </div>
                  </div>

               </div>
               
               <div className={`px-8 py-5 border-t flex justify-end space-x-3 ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className={`px-5 py-2.5 text-sm font-bold rounded-md transition-colors ${isDark ? 'text-[#a0a0a0] hover:bg-[#333333]' : 'text-[#667382] hover:bg-[#e6e8e9]'}`}>
                    Cancel
                  </button>
                  <button type="submit" className={`px-6 py-2.5 rounded-md text-sm font-bold shadow-sm transition-colors flex items-center ${isDark ? 'bg-[#ffb300] text-[#121212] hover:bg-[#d97706]' : 'bg-[#206bc4] text-white hover:bg-[#1d5fb0]'}`}>
                    <IconPlus size={18} stroke={2} className="mr-2" /> Create Product
                  </button>
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
              <p className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#667382]'}`}>Do you really want to delete this product? This action cannot be undone.</p>
            </div>
            <div className={`flex border-t ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
              <button onClick={() => setDeleteConfirmId(null)} className={`flex-1 py-3 text-sm font-medium border-r transition-colors ${isDark ? 'border-[#333333] text-[#a0a0a0] hover:text-white hover:bg-[#333333]' : 'border-[#e6e8e9] text-[#667382] hover:text-[#182433] hover:bg-[#e6e8e9]/50'}`}>Cancel</button>
              <button onClick={executeDelete} className="flex-1 py-3 text-sm font-bold text-[#d63939] hover:bg-[#d63939]/10 transition-colors">Delete Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}