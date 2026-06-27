import { useState, useEffect } from 'react';
import { IconPlus, IconPackage, IconTrash, IconMinus, IconPhoto, IconX, IconAlertTriangle } from '@tabler/icons-react';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null); // Holds ID of product to delete
  
  const [formData, setFormData] = useState({ name: '', sku: '', price: '', stock: '', category: '', image: '' });

  useEffect(() => { 
    loadProducts(); 
    loadCategories(); 
  }, []);

  const loadProducts = async () => {
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.getProducts();
        setProducts(data);
      } catch (error) { console.error(error); }
    }
  };

  const loadCategories = async () => {
    if (window.electronAPI) {
      try {
        const catData = await window.electronAPI.getCategories();
        setCategories(catData);
        if (catData.length > 0) {
          setFormData(prev => ({ ...prev, category: catData[0].name }));
        }
      } catch (error) { console.error(error); }
    }
  };

  const handleImageSelect = async () => {
    if (window.electronAPI) {
      const imagePath = await window.electronAPI.selectImage();
      if (imagePath) setFormData({ ...formData, image: imagePath });
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
      } catch (error) { console.error(error); }
    }
  };

  const executeDelete = async () => {
    if (window.electronAPI && deleteConfirmId) {
      try {
        await window.electronAPI.deleteProduct(deleteConfirmId);
        loadProducts();
        setDeleteConfirmId(null);
      } catch (error) { console.error(error); }
    }
  };

  const handleUpdateStock = async (id, currentStock, change) => {
    const newStock = currentStock + change;
    if (newStock < 0) return;
    if (window.electronAPI) {
      try {
        await window.electronAPI.updateStock({ id, newStock });
        loadProducts();
      } catch (error) { console.error(error); }
    }
  };

  const inputClass = "bg-white border border-[#e6e8e9] rounded-md px-3 py-2 text-[#182433] text-sm focus:outline-none focus:border-[#206bc4] transition-colors w-full";
  const labelClass = "block text-xs font-semibold text-[#182433] mb-1.5";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#182433]">Inventory Management</h2>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center bg-[#206bc4] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#1d5fb0] transition-colors shadow-sm"
        >
          <IconPlus stroke={2} size={18} className="mr-2" /> Add Product
        </button>
      </div>

      {/* Tabler Data Table */}
      <div className="bg-white border border-[#e6e8e9] rounded-md shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f8f9fa] text-[11px] uppercase tracking-wider text-[#667382] font-bold border-b border-[#e6e8e9]">
            <tr>
              <th className="px-5 py-3 w-10"></th>
              <th className="px-5 py-3">Product Name</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">SKU</th>
              <th className="px-5 py-3">Price</th>
              <th className="px-5 py-3 text-center">Stock Level</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6e8e9] text-[#182433]">
            {products.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-5 py-16 text-center text-[#667382]">
                  <IconPackage stroke={1} className="mx-auto h-12 w-12 mb-3 text-[#dce1e7]" />
                  <p className="text-base font-medium text-[#182433]">No products found</p>
                  <p className="text-sm mt-1">Click "Add Product" to start building your inventory.</p>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-[#f8f9fa] transition-colors group">
                  <td className="px-5 py-3">
                    {product.image ? (
                      <img src={product.image} className="h-10 w-10 rounded border border-[#e6e8e9] object-cover" alt="" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-[#f4f6fa] border border-[#e6e8e9] flex items-center justify-center text-[#667382]">
                        <IconPackage size={20} stroke={1.5} />
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 font-semibold text-[#182433]">{product.name}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#e6f0fa] text-[#206bc4]">
                      {product.category || 'N/A'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[#667382]">{product.sku}</td>
                  <td className="px-5 py-3 font-medium">${product.price.toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center space-x-3">
                      <button onClick={() => handleUpdateStock(product.id, product.stock, -1)} className="text-[#667382] hover:text-[#d63939] transition-colors"><IconMinus stroke={2} size={16} /></button>
                      <span className={`w-8 text-center font-bold ${product.stock > 10 ? 'text-[#2ba02b]' : 'text-[#d63939]'}`}>{product.stock}</span>
                      <button onClick={() => handleUpdateStock(product.id, product.stock, 1)} className="text-[#667382] hover:text-[#2ba02b] transition-colors"><IconPlus stroke={2} size={16} /></button>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => setDeleteConfirmId(product.id)} className="text-[#667382] hover:text-[#d63939] p-1 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                      <IconTrash stroke={1.5} size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL: Add Product Form (Tabler modal-report) --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#182433]/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-[#e6e8e9] flex justify-between items-center bg-white">
              <h3 className="font-bold text-[#182433] text-lg">New Product Report</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#667382] hover:text-[#d63939] transition-colors p-1"><IconX stroke={2} size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 max-h-[80vh]">
              <div className="p-6 overflow-y-auto space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className={labelClass}>Product Name</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder="e.g. Mechanical Keyboard" />
                  </div>
                  <div>
                    <label className={labelClass}>SKU (Stock Keeping Unit)</label>
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

                <div>
                  <label className={labelClass}>Product Image (Optional)</label>
                  <div className="flex items-center space-x-4 border border-[#e6e8e9] rounded-md p-3 bg-[#f8f9fa]">
                    {formData.image ? (
                      <img src={formData.image} alt="Preview" className="h-16 w-16 rounded object-cover border border-[#e6e8e9] bg-white" />
                    ) : (
                      <div className="h-16 w-16 rounded bg-white border border-[#e6e8e9] flex items-center justify-center text-[#dce1e7]">
                        <IconPhoto size={24} />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#182433] mb-1">{formData.image ? 'Image selected' : 'No image selected'}</p>
                      <button type="button" onClick={handleImageSelect} className="text-xs bg-white border border-[#e6e8e9] px-3 py-1.5 rounded font-medium text-[#667382] hover:text-[#206bc4] hover:border-[#206bc4] transition-colors">
                        Browse Files
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-[#f8f9fa] border-t border-[#e6e8e9] flex justify-end space-x-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-[#667382] hover:text-[#182433] transition-colors bg-white border border-[#e6e8e9] rounded-md shadow-sm hover:bg-[#f4f6fa]">
                  Cancel
                </button>
                <button type="submit" className="bg-[#206bc4] text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-[#1d5fb0] transition-colors shadow-sm flex items-center">
                  <IconPlus size={16} stroke={2} className="mr-1.5" /> Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Danger Confirmation (Tabler modal-danger) --- */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#182433]/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm flex flex-col overflow-hidden text-center animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="mx-auto w-12 h-12 mb-4 bg-[#d63939]/10 text-[#d63939] rounded-full flex items-center justify-center">
                <IconAlertTriangle size={24} stroke={2} />
              </div>
              <h3 className="text-lg font-bold text-[#182433] mb-2">Are you sure?</h3>
              <p className="text-[#667382] text-sm">
                Do you really want to delete this product? This action cannot be undone and will remove it from the POS.
              </p>
            </div>
            <div className="flex border-t border-[#e6e8e9] bg-[#f8f9fa]">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 text-sm font-medium text-[#667382] hover:text-[#182433] hover:bg-[#e6e8e9]/50 transition-colors border-r border-[#e6e8e9]">
                Cancel
              </button>
              <button onClick={executeDelete} className="flex-1 py-3 text-sm font-bold text-[#d63939] hover:bg-[#d63939]/10 transition-colors">
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}