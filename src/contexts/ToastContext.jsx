import { createContext, useContext, useState, useCallback } from 'react';
import { IconCheck, IconAlertCircle, IconX } from '@tabler/icons-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto-remove after 3.5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      
      {/* Toast Container (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className="pointer-events-auto bg-white border border-[#e6e8e9] rounded-md shadow-lg w-80 p-4 flex items-start animate-in slide-in-from-right-8 fade-in duration-300"
          >
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'success' ? (
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[#2ba02b]/10 text-[#2ba02b]">
                  <IconCheck size={16} stroke={2.5} />
                </span>
              ) : (
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[#d63939]/10 text-[#d63939]">
                  <IconAlertCircle size={16} stroke={2.5} />
                </span>
              )}
            </div>
            <div className="ml-3 flex-1 pt-0.5">
              <p className="text-sm font-bold text-[#182433]">
                {toast.type === 'success' ? 'Success' : 'Action Failed'}
              </p>
              <p className="text-sm text-[#667382] mt-1 leading-snug">{toast.message}</p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)} 
              className="ml-3 text-[#a0aab5] hover:text-[#182433] transition-colors focus:outline-none"
            >
              <IconX size={16} stroke={2} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};