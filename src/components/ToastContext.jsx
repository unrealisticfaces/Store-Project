import { createContext, useContext, useState } from 'react';
import { IconCheck, IconAlertTriangle, IconX } from '@tabler/icons-react';

const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    // FIX: Combine Date.now with Math.random to guarantee a unique key even if 
    // multiple toasts are fired in the exact same millisecond.
    const id = Date.now() + Math.random();
    
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500); 
  };

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col space-y-3 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center p-4 rounded-md shadow-lg border pointer-events-auto transition-all animate-in slide-in-from-right-8 duration-300 ${t.type === 'success' ? 'bg-[#2ba02b]/10 border-[#2ba02b]/20 text-[#2ba02b] backdrop-blur-md' : 'bg-[#d63939]/10 border-[#d63939]/20 text-[#d63939] backdrop-blur-md'}`}>
            {t.type === 'success' ? <IconCheck className="mr-3" size={24} stroke={2} /> : <IconAlertTriangle className="mr-3" size={24} stroke={2} />}
            <span className="font-bold text-sm tracking-wide">{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))} className="ml-6 opacity-70 hover:opacity-100 transition-opacity">
              <IconX size={18} stroke={2} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}