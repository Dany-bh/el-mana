import React, { useState } from 'react';
import api from '../services/api';
import { Lock, AlertCircle } from 'lucide-react';

const LoginPage = ({ onLogin }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (pin.length < 4) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/api/auth/login', { pin });
      onLogin(res.data);
    } catch (err) {
      setError('PIN Incorrecto. Intente nuevamente.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const addDigit = (digit) => {
    setPin((prev) => (prev.length < 4 ? prev + digit : prev));
  };

  const removeDigit = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        addDigit(e.key);
      } else if (e.key === 'Backspace') {
        removeDigit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-orange-600 p-4 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -mr-40 -mt-40" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl -ml-40 -mb-40" />

      <div className="relative z-10 bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center border border-white/30">
        {/* Logo & Title */}
        <div className="mb-10">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-3 rounded-2xl inline-flex mb-4 shadow-lg">
            <span className="text-3xl font-black text-white italic tracking-tighter">MANÁ</span>
          </div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase italic mb-1">El Maná</h2>
          <p className="text-gray-500 font-bold text-xs tracking-[0.2em]">SISTEMA POS PROFESIONAL</p>
        </div>

        {/* PIN Visualization */}
        <div className="mb-8">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Ingresa tu PIN</p>
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i} 
                className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${
                  pin.length > i 
                    ? 'bg-gradient-to-r from-orange-600 to-orange-500 border-orange-600 scale-110 shadow-lg shadow-orange-200' 
                    : 'border-gray-300 bg-white'
                }`}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl mb-4 border border-red-200 animate-in shake duration-300">
              <AlertCircle size={16} className="shrink-0" />
              <span className="text-xs font-bold">{error}</span>
            </div>
          )}
        </div>

        {/* PIN Pad */}
        <div className="mb-8 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => addDigit(n.toString())}
                className="aspect-square rounded-2xl text-2xl font-bold text-gray-700 bg-gradient-to-br from-gray-100 to-gray-50 hover:from-orange-100 hover:to-orange-50 active:scale-95 transition-all shadow-md border border-gray-200 hover:border-orange-300"
              >
                {n}
              </button>
            ))}
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPin('')} 
              className="aspect-square rounded-2xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 transition-all shadow-md border border-red-200 uppercase font-black tracking-widest"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => addDigit('0')}
              className="aspect-square rounded-2xl text-2xl font-bold text-gray-700 bg-gradient-to-br from-gray-100 to-gray-50 hover:from-orange-100 hover:to-orange-50 active:scale-95 transition-all shadow-md border border-gray-200 hover:border-orange-300"
            >
              0
            </button>
            <button
              type="button"
              onClick={removeDigit}
              className="aspect-square rounded-2xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all shadow-md border border-gray-200 uppercase font-black tracking-widest"
            >
              ← Atrás
            </button>
          </div>
        </div>

        {/* Login Button */}
        <form onSubmit={handleLogin} className="space-y-3">
          <button 
            disabled={pin.length < 4 || loading}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black py-4 rounded-2xl text-lg shadow-lg hover:shadow-xl hover:shadow-orange-300 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest"
          >
            <Lock size={20} className={loading ? 'animate-spin' : ''} />
            {loading ? 'VERIFICANDO...' : 'INGRESAR'}
          </button>
        </form>

        {/* Footer Help */}
        <p className="text-xs text-gray-400 mt-6 font-medium">Ingresa el PIN de 4 dígitos para acceder</p>
      </div>
    </div>
  );
};

export default LoginPage;
