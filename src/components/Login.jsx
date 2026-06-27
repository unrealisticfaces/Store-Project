import { useState } from 'react';
import { IconPackage, IconDeviceDesktopAnalytics, IconShieldCheck, IconChartBar } from '@tabler/icons-react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (window.electronAPI) {
      try {
        const user = await window.electronAPI.login({ username, password });
        if (user) {
          onLogin(user); 
        } else {
          setError('Invalid username or password');
        }
      } catch (err) {
        setError('Database connection error');
      }
    }
  };

  const inputClass = "w-full bg-white border border-[#e6e8e9] rounded-md px-3 py-2.5 text-[#182433] focus:outline-none focus:border-[#206bc4] transition-colors";

  return (
    <div className="min-h-screen bg-white flex">
      
      {/* Left Side: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-24 bg-white relative z-10">
        <div className="w-full max-w-sm">
          
          <div className="flex items-center space-x-2 mb-8">
            <div className="bg-[#206bc4] p-2 rounded-md text-white shadow-sm">
              <IconPackage size={24} stroke={1.5} />
            </div>
            <h1 className="text-xl font-bold text-[#182433] tracking-tight">Store Manager</h1>
          </div>

          <h2 className="text-2xl font-bold text-[#182433] mb-2">Welcome back</h2>
          <p className="text-[#667382] mb-8">Sign in to your local terminal to continue.</p>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-[#d63939]/10 border border-[#d63939]/20 text-[#d63939] px-4 py-3 rounded-md text-sm font-medium flex items-center">
                <IconShieldCheck size={18} className="mr-2" />
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-[#182433] mb-1.5">Username</label>
              <input 
                type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                className={inputClass} placeholder="Enter your username"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-semibold text-[#182433]">Password</label>
              </div>
              <input 
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className={inputClass} placeholder="Enter your password"
              />
            </div>

            <div className="pt-2">
              <button type="submit" className="w-full flex justify-center items-center bg-[#206bc4] text-white px-4 py-2.5 rounded-md text-sm font-bold hover:bg-[#1d5fb0] transition-colors shadow-sm">
                Sign In
              </button>
            </div>
          </form>
          
          <div className="mt-8 pt-8 border-t border-[#e6e8e9] text-center">
            <p className="text-xs text-[#667382]">Offline Local Network System v1.0</p>
          </div>
        </div>
      </div>

      {/* Right Side: Illustration (Offline friendly) */}
      <div className="hidden lg:flex w-1/2 bg-[#f4f6fa] border-l border-[#e6e8e9] relative items-center justify-center overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <IconChartBar size={400} stroke={0.5} className="text-[#206bc4] transform translate-x-32 -translate-y-32" />
        </div>
        
        {/* Main "Illustration" */}
        <div className="relative z-10 text-center max-w-md px-8">
          <div className="bg-white p-6 rounded-2xl shadow-xl inline-block mb-8 border border-[#e6e8e9]">
            <IconDeviceDesktopAnalytics size={80} stroke={1} className="text-[#206bc4]" />
          </div>
          <h3 className="text-2xl font-bold text-[#182433] mb-4">Complete Store Control</h3>
          <p className="text-[#667382] leading-relaxed">
            Manage your inventory, process point-of-sale transactions, and analyze your offline revenue securely from your local machine.
          </p>
        </div>
      </div>

    </div>
  );
}