import { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, Package } from 'lucide-react';

export default function Orders() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.getProducts();
        setProducts(data.filter(p => p.stock > 0)); 
      } catch (error) {
        console.error("Failed to load products:", error);
      }
    }
  };

  const addToCart = (product) => {
    setCart(currentCart => {
      const existing = currentCart.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert("Not enough stock!");
          return currentCart;
        }
        return currentCart.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, change) => {
    setCart(currentCart => {
      return currentCart.map(item => {
        if (item.id === id) {
          const newQuantity = item.quantity + change;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      });
    });
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    if (window.electronAPI) {
      try {
        await window.electronAPI.processOrder(cart);
        alert("Payment Successful! Order recorded.");
        setCart([]);
        loadProducts(); 
      } catch (error) {
        console.error("Checkout failed:", error);
        alert("Failed to process order.");
      }
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="h-full flex gap-6">
      {/* Product Grid (Left) */}
      <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-6 overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-6">Point of Sale</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.length === 0 ? (
            <p className="text-zinc-500 col-span-full">No products in stock. Add some in Inventory!</p>
          ) : (
            products.map(product => (
              <div 
                key={product.id} 
                onClick={() => addToCart(product)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg cursor-pointer hover:border-amber-500 transition-all overflow-hidden flex flex-col group"
              >
                {/* Image Area */}
                <div className="h-36 bg-zinc-800 relative overflow-hidden">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      <Package size={32} />
                    </div>
                  )}
                  {product.category && (
                    <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] uppercase font-bold px-2 py-1 rounded backdrop-blur-md">
                      {product.category}
                    </span>
                  )}
                </div>
                
                {/* Product Info */}
                <div className="p-4 flex-1 flex flex-col justify-between bg-zinc-900">
                  <div>
                    <h3 className="font-medium text-white line-clamp-1">{product.name}</h3>
                    <p className="text-xs text-zinc-500 mt-1">SKU: {product.sku}</p>
                  </div>
                  <div className="flex justify-between items-end mt-3">
                    <span className="text-amber-500 font-bold">${product.price.toFixed(2)}</span>
                    <span className="text-xs font-medium text-zinc-400">{product.stock} left</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cart (Right) */}
      <div className="w-96 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center space-x-2">
          <ShoppingCart size={20} className="text-amber-500" />
          <h2 className="text-lg font-bold text-white">Current Order</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
              Cart is empty
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-zinc-900 p-3 rounded-md border border-zinc-800">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-white">{item.name}</h4>
                  <p className="text-xs text-amber-500">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
                
                <div className="flex items-center space-x-3 mx-4">
                  <button onClick={() => updateQuantity(item.id, -1)} className="text-zinc-400 hover:text-white"><Minus size={14} /></button>
                  <span className="text-sm font-medium text-white w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="text-zinc-400 hover:text-white"><Plus size={14} /></button>
                </div>
                
                <button onClick={() => removeFromCart(item.id)} className="text-zinc-500 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-zinc-900 border-t border-zinc-800">
          <div className="flex justify-between items-center mb-4">
            <span className="text-zinc-400">Total</span>
            <span className="text-2xl font-bold text-white">${cartTotal.toFixed(2)}</span>
          </div>
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full flex items-center justify-center space-x-2 bg-amber-500 text-black py-3 rounded-md font-bold hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CreditCard size={18} />
            <span>Process Payment</span>
          </button>
        </div>
      </div>
    </div>
  );
}