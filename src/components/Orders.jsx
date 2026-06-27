import { useState, useEffect, useRef } from 'react';
import { IconShoppingCart, IconTrash, IconPlus, IconMinus, IconCreditCard, IconPackage, IconSearch, IconBarcode, IconUser } from '@tabler/icons-react';
import { useToast } from '../contexts/ToastContext';

export default function Orders() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [settings, setSettings] = useState({ currency: 'USD', taxRate: '0' });
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [useStoreCredit, setUseStoreCredit] = useState(false);
  const [activeShift, setActiveShift] = useState(null); // Tracks the open Z-Report shift
  
  const searchInputRef = useRef(null); 
  const showToast = useToast();

  useEffect(() => { 
    loadData();
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  const loadData = async () => {
    if (window.electronAPI) {
      try {
        setProducts(await window.electronAPI.getProducts());
        setCustomers(await window.electronAPI.getCustomers());
        setActiveShift(await window.electronAPI.getActiveShift()); // Fetch Shift Status
        
        const sData = await window.electronAPI.getSettings();
        const sObj = {};
        sData.forEach(item => sObj[item.key] = item.value);
        setSettings({ currency: sObj.currency || 'USD', taxRate: sObj.taxRate || '0' });
      } catch (error) { console.error(error); }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      const scannedProduct = products.find(p => p.sku.toLowerCase() === searchQuery.trim().toLowerCase());
      if (scannedProduct) {
        addToCart(scannedProduct);
        setSearchQuery('');
      } else {
        showToast(`Product not found with SKU: ${searchQuery}`, "error");
        setSearchQuery('');
      }
    }
  };

  const addToCart = (product) => {
    if (product.stock <= 0) return showToast("Item out of stock!", "error");
    setCart(currentCart => {
      const existing = currentCart.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showToast(`Not enough stock. Only ${product.stock} available.`, 'error');
          return currentCart;
        }
        return currentCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, change) => {
    setCart(currentCart => currentCart.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + change;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));

  const currencySymbol = { USD: '$', EUR: '€', GBP: '£', PHP: '₱' }[settings.currency] || '$';
  const taxRateNum = parseFloat(settings.taxRate) || 0;
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxAmount = subtotal * (taxRateNum / 100);
  const grandTotal = subtotal + taxAmount;

  const selectedCustomer = customers.find(c => c.id === parseInt(selectedCustomerId));
  const maxCreditAvailable = selectedCustomer ? selectedCustomer.store_credit : 0;
  const creditApplied = (useStoreCredit && maxCreditAvailable > 0) ? Math.min(maxCreditAvailable, grandTotal) : 0;
  const finalAmountDue = grandTotal - creditApplied;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    // Safety check: Cannot process sales if the register is closed
    if (!activeShift) {
      return showToast("You must Open a Shift before processing sales!", "error");
    }

    if (window.electronAPI) {
      try {
        await window.electronAPI.processOrder({
          cart,
          customerId: selectedCustomerId ? parseInt(selectedCustomerId) : null,
          shiftId: activeShift.id, // Links the sale to the current Z-Report
          creditUsed: creditApplied
        });
        
        setCart([]);
        setSelectedCustomerId('');
        setUseStoreCredit(false);
        loadData(); 
        showToast("Payment processed successfully!", "success");
        setTimeout(() => searchInputRef.current?.focus(), 100);
      } catch (error) { showToast("Failed to process order.", "error"); }
    }
  };

  const filteredProducts = products.filter(p => p.stock > 0 && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div className="h-full flex gap-6 max-w-[1400px] mx-auto">
      
      <div className="flex-1 bg-white border border-[#e6e8e9] rounded-md flex flex-col overflow-hidden shadow-sm">
        <div className="p-5 border-b border-[#e6e8e9] flex items-center justify-between bg-white z-10">
          <h2 className="text-xl font-bold text-[#182433]">Point of Sale</h2>
          <div className="relative w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#a0aab5]"><IconBarcode size={18} stroke={1.5} /></div>
            <input ref={searchInputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder="Scan barcode or search name..." className="w-full bg-[#f4f6fa] border border-[#e6e8e9] rounded-md pl-10 pr-3 py-2 text-sm text-[#182433] focus:outline-none focus:border-[#206bc4] focus:bg-white transition-colors" />
          </div>
        </div>

        <div className="flex-1 p-5 overflow-y-auto bg-[#f8f9fa]">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <div key={product.id} onClick={() => addToCart(product)} className="bg-white border border-[#e6e8e9] rounded-md cursor-pointer hover:border-[#206bc4] hover:shadow-md transition-all overflow-hidden flex flex-col group">
                <div className="h-32 bg-[#f4f6fa] relative overflow-hidden border-b border-[#e6e8e9]">
                  {product.image ? <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center text-[#dce1e7]"><IconPackage size={32} /></div>}
                  {product.category && <span className="absolute top-2 right-2 bg-white/90 text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#e6e8e9] shadow-sm">{product.category}</span>}
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-[#182433] line-clamp-1 text-sm">{product.name}</h3>
                    <p className="text-[11px] text-[#667382] mt-0.5">SKU: {product.sku}</p>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <span className="text-[#206bc4] font-bold">{currencySymbol}{product.price.toFixed(2)}</span>
                    <span className="text-[11px] font-medium text-[#667382]">{product.stock} left</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-[400px] bg-white border border-[#e6e8e9] rounded-md flex flex-col overflow-hidden shadow-sm">
        
        <div className="p-4 border-b border-[#e6e8e9] bg-[#f8f9fa]">
          <label className="block text-xs font-bold text-[#667382] uppercase tracking-wider mb-2">Assign Customer</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667382]"><IconUser size={16} stroke={2} /></div>
            <select 
              value={selectedCustomerId} 
              onChange={(e) => { setSelectedCustomerId(e.target.value); setUseStoreCredit(false); }}
              className="w-full bg-white border border-[#e6e8e9] rounded-md pl-9 pr-3 py-2 text-sm text-[#182433] focus:outline-none focus:border-[#206bc4] font-medium appearance-none shadow-sm"
            >
              <option value="">Walk-in Customer (Guest)</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.store_credit > 0 ? `(${currencySymbol}${c.store_credit.toFixed(2)} credit)` : ''}</option>)}
            </select>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8f9fa]">
          {cart.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-md border border-[#e6e8e9] bg-white shadow-sm">
              <div className="flex-1 pr-2">
                <h4 className="text-sm font-semibold text-[#182433] leading-tight line-clamp-1">{item.name}</h4>
                <p className="text-xs text-[#206bc4] font-medium mt-0.5">{currencySymbol}{(item.price * item.quantity).toFixed(2)}</p>
              </div>
              <div className="flex items-center space-x-2 mx-1">
                <button onClick={() => updateQuantity(item.id, -1)} className="text-[#667382] p-1 bg-[#f4f6fa] rounded border border-[#e6e8e9]"><IconMinus size={12} stroke={2}/></button>
                <span className="text-sm font-bold text-[#182433] w-5 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, 1)} className="text-[#667382] p-1 bg-[#f4f6fa] rounded border border-[#e6e8e9]"><IconPlus size={12} stroke={2}/></button>
              </div>
              <button onClick={() => removeFromCart(item.id)} className="text-[#667382] hover:text-[#d63939] p-1 ml-1"><IconTrash size={16} stroke={1.5} /></button>
            </div>
          ))}
        </div>

        <div className="p-5 bg-white border-t border-[#e6e8e9] space-y-2 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#667382] font-medium">Subtotal</span><span className="font-semibold text-[#182433]">{currencySymbol}{subtotal.toFixed(2)}</span>
          </div>
          {taxRateNum > 0 && (
            <div className="flex justify-between items-center text-sm border-b border-[#e6e8e9] pb-3">
              <span className="text-[#667382] font-medium">Tax ({taxRateNum}%)</span><span className="font-semibold text-[#182433]">{currencySymbol}{taxAmount.toFixed(2)}</span>
            </div>
          )}

          {selectedCustomer && maxCreditAvailable > 0 && (
            <div className="py-3 border-b border-[#e6e8e9]">
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" checked={useStoreCredit} onChange={(e) => setUseStoreCredit(e.target.checked)} className="w-4 h-4 text-[#206bc4] bg-white border-[#e6e8e9] rounded" />
                <span className="ml-2 text-sm font-semibold text-[#182433]">Use Store Credit</span>
                <span className="ml-auto text-sm font-bold text-[#2ba02b]">-{currencySymbol}{creditApplied.toFixed(2)}</span>
              </label>
            </div>
          )}
          
          <div className="flex justify-between items-end pt-2 mb-4">
            <span className="text-[#182433] font-bold text-sm uppercase tracking-wide">{useStoreCredit && finalAmountDue === 0 ? 'Balance Due' : 'Total'}</span>
            <span className="text-3xl font-bold text-[#2ba02b] leading-none tracking-tight">{currencySymbol}{finalAmountDue.toFixed(2)}</span>
          </div>
          
          <button onClick={handleCheckout} disabled={cart.length === 0} className="w-full flex items-center justify-center space-x-2 bg-[#206bc4] text-white py-3 rounded-md font-bold hover:bg-[#1d5fb0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
            <IconCreditCard size={18} stroke={2} /> <span>Process Payment</span>
          </button>
        </div>
      </div>
    </div>
  );
}