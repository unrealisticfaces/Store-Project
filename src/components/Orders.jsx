import { useState, useEffect, useRef } from 'react';
import { IconShoppingCart, IconTrash, IconPlus, IconMinus, IconCreditCard, IconPackage, IconSearch, IconBarcode, IconUser, IconDiscount2, IconCheck, IconPrinter, IconX } from '@tabler/icons-react';
import { useToast } from '../contexts/ToastContext';

export default function Orders({ theme }) {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [settings, setSettings] = useState({ currency: 'USD', taxRate: '0' });
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [useStoreCredit, setUseStoreCredit] = useState(false);
  const [activeShift, setActiveShift] = useState(null);
  
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState('');

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [amountTendered, setAmountTendered] = useState('');
  const [receiptOrder, setReceiptOrder] = useState(null);

  const searchInputRef = useRef(null); 
  const showToast = useToast();
  const isDark = theme === 'dark';

  useEffect(() => { loadData(); if (searchInputRef.current) searchInputRef.current.focus(); }, []);

  const loadData = async () => {
    if (window.electronAPI) {
      try {
        setProducts(await window.electronAPI.getProducts());
        setCustomers(await window.electronAPI.getCustomers());
        setActiveShift(await window.electronAPI.getActiveShift()); 
        const sData = await window.electronAPI.getSettings();
        const sObj = {}; sData.forEach(item => sObj[item.key] = item.value);
        setSettings({ currency: sObj.currency || 'USD', taxRate: sObj.taxRate || '0' });
      } catch (error) {}
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      const scannedProduct = products.find(p => p.sku.toLowerCase() === searchQuery.trim().toLowerCase());
      if (scannedProduct) { addToCart(scannedProduct); setSearchQuery(''); } 
      else { showToast(`Product not found`, "error"); setSearchQuery(''); }
    }
  };

  const addToCart = (product) => {
    if (product.stock <= 0) return showToast("Item out of stock!", "error");
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem && existingItem.quantity >= product.stock) return showToast(`Not enough stock. Only ${product.stock} available.`, "error");
    setCart(currentCart => {
      const existing = currentCart.find(item => item.id === product.id);
      if (existing) return currentCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, change) => {
    setCart(currentCart => currentCart.map(item => {
      if (item.id === id) { const newQuantity = item.quantity + change; return newQuantity > 0 ? { ...item, quantity: newQuantity } : item; }
      return item;
    }));
  };
  const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));

  const currencySymbol = { USD: '$', EUR: '€', GBP: '£', PHP: '₱' }[settings.currency] || '$';
  const taxRateNum = parseFloat(settings.taxRate) || 0;
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxAmount = subtotal * (taxRateNum / 100);
  const preDiscountTotal = subtotal + taxAmount;
  let calculatedDiscount = discountType === 'flat' ? (parseFloat(discountValue) || 0) : (discountType === 'percent' ? preDiscountTotal * ((parseFloat(discountValue) || 0) / 100) : 0);
  const postDiscountTotal = Math.max(0, preDiscountTotal - calculatedDiscount);
  const selectedCustomer = customers.find(c => c.id === parseInt(selectedCustomerId));
  const maxCreditAvailable = selectedCustomer ? selectedCustomer.store_credit : 0;
  const creditApplied = (useStoreCredit && maxCreditAvailable > 0) ? Math.min(maxCreditAvailable, postDiscountTotal) : 0;
  const finalAmountDue = postDiscountTotal - creditApplied;

  const tendered = parseFloat(amountTendered) || 0;
  const changeDue = Math.max(0, tendered - finalAmountDue);
  const isTenderValid = tendered >= (finalAmountDue - 0.001);

  const triggerCheckout = () => {
    if (cart.length === 0) return;
    if (!activeShift) return showToast("You must Open a Shift before processing sales!", "error");
    setAmountTendered('');
    setConfirmModalOpen(true);
  };

  const handleCheckoutConfirm = async () => {
    setConfirmModalOpen(false);
    if (window.electronAPI) {
      try {
        await window.electronAPI.processOrder({
          cart, 
          customerId: selectedCustomerId ? parseInt(selectedCustomerId) : null,
          shiftId: activeShift.id, 
          creditUsed: creditApplied, 
          discount: calculatedDiscount,
          cashHanded: tendered,
          change: changeDue
        });
        const transData = await window.electronAPI.getTransactions();
        setReceiptOrder(transData[0]); 
        setCart([]); setSelectedCustomerId(''); setUseStoreCredit(false); setDiscountType('none'); setDiscountValue('');
        loadData(); showToast("Payment processed successfully!", "success");
      } catch (error) { showToast("Failed to process order.", "error"); }
    }
  };

  const handlePrintReceipt = async () => {
    if (window.electronAPI && receiptOrder) {
      await window.electronAPI.printReceipt({ order: receiptOrder, settings });
    }
  };

  const filteredProducts = products.filter(p => p.stock > 0 && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase())));

  const bgPanel = isDark ? "bg-[#1e1e1e] border-[#333333]" : "bg-white border-[#e6e8e9]";
  const bgInner = isDark ? "bg-[#1a1a1a]" : "bg-[#f8f9fa]";
  const textPrimary = isDark ? "text-white" : "text-[#182433]";
  const textSecondary = isDark ? "text-[#a0a0a0]" : "text-[#667382]";
  const inputClass = isDark ? "bg-[#121212] border-[#333333] text-white focus:border-[#ffb300]" : "bg-white border-[#e6e8e9] text-[#182433] focus:border-[#206bc4]";

  return (
    <div className="h-full flex gap-6 max-w-[1400px] mx-auto relative">
      <div className={`flex-1 border rounded-md flex flex-col overflow-hidden shadow-sm ${bgPanel}`}>
        <div className={`p-5 border-b flex items-center justify-between z-10 ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
          <h2 className={`text-xl font-bold ${textPrimary}`}>Point of Sale</h2>
          <div className="relative w-72">
            <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${isDark ? 'text-[#555]' : 'text-[#a0aab5]'}`}><IconBarcode size={18} stroke={1.5} /></div>
            <input ref={searchInputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder="Scan barcode or search name..." className={`w-full border rounded-md pl-10 pr-3 py-2 text-sm focus:outline-none transition-colors ${inputClass}`} />
          </div>
        </div>

        <div className={`flex-1 p-5 overflow-y-auto ${bgInner}`}>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <div key={product.id} onClick={() => addToCart(product)} className={`border rounded-md cursor-pointer transition-all overflow-hidden flex flex-col group ${isDark ? 'bg-[#252525] border-[#333333] hover:border-[#ffb300]' : 'bg-white border-[#e6e8e9] hover:border-[#206bc4] hover:shadow-md'}`}>
                <div className={`h-32 relative overflow-hidden border-b ${isDark ? 'bg-[#121212] border-[#333333]' : 'bg-[#f4f6fa] border-[#e6e8e9]'}`}>
                  {product.image ? <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className={`w-full h-full flex items-center justify-center ${isDark ? 'text-[#333]' : 'text-[#dce1e7]'}`}><IconPackage size={32} /></div>}
                  {product.category && <span className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded border shadow-sm ${isDark ? 'bg-[#1e1e1e]/90 text-[#e0e0e0] border-[#333333]' : 'bg-white/90 text-[#182433] border-[#e6e8e9]'}`}>{product.category}</span>}
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div><h3 className={`font-semibold line-clamp-1 text-sm ${textPrimary}`}>{product.name}</h3><p className={`text-[11px] mt-0.5 ${textSecondary}`}>SKU: {product.sku}</p></div>
                  <div className="flex justify-between items-end mt-2">
                    <span className={`font-bold ${isDark ? 'text-[#ffb300]' : 'text-[#206bc4]'}`}>{currencySymbol}{product.price.toFixed(2)}</span>
                    <span className={`text-[11px] font-medium ${textSecondary}`}>{product.stock} left</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`w-[400px] border rounded-md flex flex-col overflow-hidden shadow-sm ${bgPanel}`}>
        <div className={`p-4 border-b ${isDark ? 'bg-[#1a1a1a] border-[#333333]' : 'bg-[#f8f9fa] border-[#e6e8e9]'}`}>
          <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Assign Customer</label>
          <div className="relative">
            <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${textSecondary}`}><IconUser size={16} stroke={2} /></div>
            <select value={selectedCustomerId} onChange={(e) => { setSelectedCustomerId(e.target.value); setUseStoreCredit(false); }} className={`w-full border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none appearance-none shadow-sm ${inputClass}`}>
              <option value="">Walk-in Customer (Guest)</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.store_credit > 0 ? `(${currencySymbol}${c.store_credit.toFixed(2)} credit)` : ''}</option>)}
            </select>
          </div>
        </div>
        
        <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${bgInner}`}>
          {cart.map(item => (
            <div key={item.id} className={`flex items-center justify-between p-3 rounded-md border shadow-sm ${isDark ? 'bg-[#252525] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
              <div className="flex-1 pr-2">
                <h4 className={`text-sm font-semibold leading-tight line-clamp-1 ${textPrimary}`}>{item.name}</h4>
                <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-[#ffb300]' : 'text-[#206bc4]'}`}>{currencySymbol}{(item.price * item.quantity).toFixed(2)}</p>
              </div>
              <div className="flex items-center space-x-2 mx-1">
                <button onClick={() => updateQuantity(item.id, -1)} className={`p-1 rounded border ${isDark ? 'bg-[#1a1a1a] border-[#333333] text-[#a0a0a0]' : 'bg-[#f4f6fa] border-[#e6e8e9] text-[#667382]'}`}><IconMinus size={12} stroke={2}/></button>
                <span className={`text-sm font-bold w-5 text-center ${textPrimary}`}>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, 1)} className={`p-1 rounded border ${isDark ? 'bg-[#1a1a1a] border-[#333333] text-[#a0a0a0]' : 'bg-[#f4f6fa] border-[#e6e8e9] text-[#667382]'}`}><IconPlus size={12} stroke={2}/></button>
              </div>
              <button onClick={() => removeFromCart(item.id)} className={`p-1 ml-1 hover:text-[#d63939] ${textSecondary}`}><IconTrash size={16} stroke={1.5} /></button>
            </div>
          ))}
        </div>

        <div className={`p-5 border-t space-y-2 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] ${isDark ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#e6e8e9]'}`}>
          <div className="flex justify-between items-center text-sm"><span className={`font-medium ${textSecondary}`}>Subtotal</span><span className={`font-semibold ${textPrimary}`}>{currencySymbol}{subtotal.toFixed(2)}</span></div>
          {taxRateNum > 0 && <div className="flex justify-between items-center text-sm"><span className={`font-medium ${textSecondary}`}>Tax ({taxRateNum}%)</span><span className={`font-semibold ${textPrimary}`}>{currencySymbol}{taxAmount.toFixed(2)}</span></div>}
          <div className={`py-3 border-y flex items-center space-x-2 ${isDark ? 'border-[#333333]' : 'border-[#e6e8e9]'}`}>
            <IconDiscount2 size={18} className={textSecondary} />
            <select value={discountType} onChange={(e) => { setDiscountType(e.target.value); setDiscountValue(''); }} className={`border rounded p-1 text-xs outline-none ${inputClass}`}>
              <option value="none">No Discount</option>
              <option value="flat">Amount Off</option>
              <option value="percent">% Off</option>
            </select>
            {discountType !== 'none' && <input type="number" step="0.01" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder="Value..." className={`border rounded p-1 w-20 text-xs outline-none ${inputClass}`} />}
            {calculatedDiscount > 0 && <span className="ml-auto text-sm font-bold text-[#d63939]">-{currencySymbol}{calculatedDiscount.toFixed(2)}</span>}
          </div>
          {selectedCustomer && maxCreditAvailable > 0 && (
            <div className={`py-3 border-b ${isDark ? 'border-[#333333]' : 'border-[#e6e8e9]'}`}>
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" checked={useStoreCredit} onChange={(e) => setUseStoreCredit(e.target.checked)} className="w-4 h-4 rounded" />
                <span className={`ml-2 text-sm font-semibold ${textPrimary}`}>Use Store Credit</span>
                <span className="ml-auto text-sm font-bold text-[#2ba02b]">-{currencySymbol}{creditApplied.toFixed(2)}</span>
              </label>
            </div>
          )}
          <div className="flex justify-between items-end pt-2 mb-4">
            <span className={`font-bold text-sm uppercase tracking-wide ${textPrimary}`}>Total Due</span>
            <span className={`text-3xl font-bold leading-none tracking-tight ${isDark ? 'text-[#ffb300]' : 'text-[#2ba02b]'}`}>{currencySymbol}{finalAmountDue.toFixed(2)}</span>
          </div>
          <button onClick={triggerCheckout} disabled={cart.length === 0} className={`w-full flex items-center justify-center space-x-2 text-[#121212] py-3 rounded-md font-bold transition-colors disabled:opacity-50 shadow-sm ${isDark ? 'bg-[#ffb300] hover:bg-[#d97706]' : 'bg-[#206bc4] text-white hover:bg-[#1d5fb0]'}`}>
            <IconCreditCard size={18} stroke={2} /> <span>Process Payment</span>
          </button>
        </div>
      </div>

      {confirmModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#121212]/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden text-center animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1e1e1e] border border-[#333333]' : 'bg-white'}`}>
            <button onClick={() => setConfirmModalOpen(false)} className={`absolute top-4 right-4 transition-colors ${isDark ? 'text-[#a0a0a0] hover:text-[#d63939]' : 'text-[#667382] hover:text-[#d63939]'}`}><IconX size={20} stroke={2} /></button>
            <div className="p-6 pt-10">
              <div className={`mx-auto w-16 h-16 mb-4 rounded-full flex items-center justify-center shadow-lg ${isDark ? 'bg-[#ffb300]/20 text-[#ffb300]' : 'bg-[#206bc4]/20 text-[#206bc4]'}`}><IconCreditCard size={32} stroke={2} /></div>
              <h3 className={`text-xl font-bold mb-1 ${textPrimary}`}>Payment Required</h3>
              <p className={`text-sm mb-6 ${textSecondary}`}>Charging <span className="font-bold">{cart.reduce((s,i)=>s+i.quantity,0)} items</span> to current invoice.</p>
              <div className={`text-4xl font-black mb-8 ${isDark ? 'text-[#ffb300]' : 'text-[#2ba02b]'}`}>{currencySymbol}{finalAmountDue.toFixed(2)}</div>

              <div className="text-left space-y-4 px-2">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wide mb-1 ${textSecondary}`}>Amount Tendered</label>
                  <div className="relative">
                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none font-bold ${textSecondary}`}>{currencySymbol}</div>
                    <input type="number" step="0.01" value={amountTendered} onChange={(e) => setAmountTendered(e.target.value)} className={`w-full border rounded-md pl-8 pr-3 py-3 text-lg font-bold focus:outline-none transition-colors ${inputClass}`} placeholder={finalAmountDue.toFixed(2)} autoFocus />
                  </div>
                </div>
                <div className={`flex justify-between items-center p-3 rounded-md border ${isDark ? 'bg-[#1a1a1a] border-[#333333]' : 'bg-[#f4f6fa] border-[#e6e8e9]'}`}>
                  <span className={`text-sm font-bold uppercase tracking-wide ${textSecondary}`}>Change Due</span>
                  <span className={`text-xl font-black ${changeDue > 0 ? (isDark ? 'text-white' : 'text-[#182433]') : textSecondary}`}>{currencySymbol}{changeDue.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className={`flex p-4 gap-2 border-t ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
              <button onClick={() => setConfirmModalOpen(false)} className={`flex-1 py-3 text-sm font-bold rounded transition-colors border ${isDark ? 'text-[#a0a0a0] border-[#333333] hover:text-white hover:bg-[#333333]' : 'text-[#667382] border-[#e6e8e9] hover:text-[#182433] hover:bg-[#e6e8e9]'}`}>Cancel</button>
              <button onClick={handleCheckoutConfirm} disabled={!isTenderValid} className={`flex-1 py-3 text-sm font-bold rounded shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-[#ffb300] text-[#121212] hover:bg-[#d97706]' : 'bg-[#206bc4] text-white hover:bg-[#1d5fb0]'}`}>Confirm & Print</button>
            </div>
          </div>
        </div>
      )}

      {receiptOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#121212]/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden text-center animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1e1e1e] border border-[#333333]' : 'bg-white'}`}>
            <div className="p-6 pt-10">
              <div className="mx-auto w-16 h-16 mb-4 bg-[#2ba02b] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#2ba02b]/30"><IconCheck size={32} stroke={3} /></div>
              <h3 className={`text-xl font-bold mb-2 ${textPrimary}`}>Payment Successful!</h3>
              <p className={`text-sm mb-4 ${textSecondary}`}>Transaction completed securely.</p>
              <div className={`p-4 rounded-md text-left mb-2 border ${isDark ? 'bg-[#252525] border-[#333333]' : 'bg-[#f8f9fa] border-[#e6e8e9]'}`}>
                <div className="flex justify-between text-xs mb-1"><span className={textSecondary}>Invoice:</span><span className={`font-bold ${isDark ? 'text-[#ffb300]' : 'text-[#206bc4]'}`}>{receiptOrder.invoice_id}</span></div>
                <div className="flex justify-between text-xs mb-1"><span className={textSecondary}>Time:</span><span className={`font-bold ${textPrimary}`}>{new Date(receiptOrder.date).toLocaleTimeString()}</span></div>
                <div className="flex justify-between text-xs border-t pt-1 mt-1 border-dashed border-[#a0a0a0]"><span className={textSecondary}>Amount Paid:</span><span className={`font-black ${textPrimary}`}>{currencySymbol}{((receiptOrder.total||0) - (receiptOrder.credit_used||0)).toFixed(2)}</span></div>
              </div>
            </div>
            <div className={`flex flex-col p-4 gap-2 border-t ${isDark ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e6e8e9] bg-[#f8f9fa]'}`}>
              <button onClick={handlePrintReceipt} className={`w-full flex items-center justify-center py-2.5 text-sm font-bold rounded shadow-sm transition-colors border ${isDark ? 'bg-[#252525] border-[#333333] text-white hover:bg-[#333333]' : 'bg-white border-[#e6e8e9] text-[#182433] hover:bg-[#f4f6fa]'}`}><IconPrinter size={18} className="mr-2"/> Print Receipt</button>
              <button onClick={() => setReceiptOrder(null)} className={`w-full py-2.5 text-sm font-bold rounded transition-colors ${isDark ? 'bg-[#ffb300] text-[#121212] hover:bg-[#d97706]' : 'bg-[#206bc4] text-white hover:bg-[#1d5fb0]'}`}>New Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}