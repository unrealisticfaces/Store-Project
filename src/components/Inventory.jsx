import { useState, useEffect } from 'react';
import { Plus, Package, Trash2, MinusCircle, PlusCircle, Image as ImageIcon } from 'lucide-react';

// Updated Categories!
const CATEGORIES = ['Food', 'Drinks', 'Snacks', 'Produce', 'Household', 'Other'];

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', sku: '', price: '', stock: '', category: 'Food', image: '' });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.getProducts();
        setProducts(data);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleImageSelect = async () => {
    if (window.electronAPI) {
      const imagePath = await window.electronAPI.selectImage();
      if (imagePath) {
        setFormData({ ...formData, image: imagePath });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (window.electronAPI) {
      try {
        await window.electronAPI.addProduct({
          name: formData.name,
          sku: formData.sku,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock, 10),
          category: formData.category,
          image: formData.image
        });
        loadProducts();
        setShowForm(false);
        setFormData({ name: '', sku: '', price: '', stock: '', category: 'Food', image: '' });
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.electronAPI && window.confirm('Are you sure you want to delete this product?')) {
      try {
        await window.electronAPI.deleteProduct(id);
        loadProducts();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleUpdateStock = async (id, currentStock, change) => {
    const newStock = currentStock + change;
    if (newStock < 0) return;

    if (window.electronAPI) {
      try {
        await window.electronAPI.updateStock({ id, newStock });
        loadProducts();
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-white">Inventory</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center bg-amber-500 text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-amber-400 transition-colors"
        >
          <Plus size={16} className="mr-2" />
          Add Product
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-sm grid grid-cols-2 gap-4">
          <input
            type="text" placeholder="Product Name" required value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-white focus:outline-none focus:border-amber-500"
          />
          <input
            type="text" placeholder="SKU" required value={formData.sku}
            onChange={(e) => setFormData({...formData, sku: e.target.value})}
            className="bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-white focus:outline-none focus:border-amber-500"
          />
          <input
            type="number" step="0.01" placeholder="Price" required value={formData.price}
            onChange={(e) => setFormData({...formData, price: e.target.value})}
            className="bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-white focus:outline-none focus:border-amber-500"
          />
          <input
            type="number" placeholder="Stock Quantity" required value={formData.stock}
            onChange={(e) => setFormData({...formData, stock: e.target.value})}
            className="bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-white focus:outline-none focus:border-amber-500"
          />
          
          <select
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            className="bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-white focus:outline-none focus:border-amber-500"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={handleImageSelect}
              className="flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2 text-zinc-300 hover:text-white hover:border-amber-500 transition-colors w-full"
            >
              <ImageIcon size={18} className="mr-2" />
              {formData.image ? 'Change Image' : 'Select Image'}
            </button>
            {formData.image && (
              <img src={formData.image} alt="Preview" className="h-10 w-10 rounded object-cover border border-zinc-800" />
            )}
          </div>

          <div className="col-span-2 flex justify-end space-x-2 mt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white">
              Cancel
            </button>
            <button type="submit" className="bg-amber-500 text-black px-6 py-2 rounded-md text-sm font-medium hover:bg-amber-400 transition-colors">
              Save Product
            </button>
          </div>
        </form>
      )}

      <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-900/50 text-xs uppercase text-zinc-500 border-b border-zinc-800">
            <tr>
              <th className="px-6 py-4 font-medium">Product</th>
              <th className="px-6 py-4 font-medium">Category</th>
              <th className="px-6 py-4 font-medium">SKU</th>
              <th className="px-6 py-4 font-medium">Price</th>
              <th className="px-6 py-4 font-medium">Stock</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {products.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center">
                  <Package className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                  <p>No products in inventory.</p>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{product.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300">
                      {product.category || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">{product.sku}</td>
                  <td className="px-6 py-4">${product.price.toFixed(2)}</td>
                  <td className="px-6 py-4 flex items-center space-x-3">
                    <button onClick={() => handleUpdateStock(product.id, product.stock, -1)} className="text-zinc-500 hover:text-amber-500 transition-colors">
                      <MinusCircle size={18} />
                    </button>
                    <span className={`w-8 text-center font-medium ${product.stock > 10 ? 'text-green-500' : 'text-red-500'}`}>
                      {product.stock}
                    </span>
                    <button onClick={() => handleUpdateStock(product.id, product.stock, 1)} className="text-zinc-500 hover:text-amber-500 transition-colors">
                      <PlusCircle size={18} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(product.id)} className="text-zinc-500 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}