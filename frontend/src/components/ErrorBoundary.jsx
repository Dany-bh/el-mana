import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    sessionStorage.removeItem('el_mana_custom_waiter_name'); // Reset temporary custom waiter name just in case
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-xl w-full max-w-md border border-red-100 text-center relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/5 rounded-full blur-2xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-orange-500/5 rounded-full blur-2xl" />

            <div className="bg-red-50 p-4.5 rounded-3xl inline-flex mb-6 text-red-600 border border-red-100 shadow-sm relative z-10 animate-bounce">
              <AlertCircle size={36} />
            </div>

            <h3 className="text-2xl font-black text-gray-800 tracking-tighter uppercase italic mb-2 relative z-10">
              Algo no salió bien
            </h3>
            <p className="text-gray-500 text-sm mb-6 font-semibold leading-relaxed relative z-10">
              El panel del mozo experimentó un error temporal de renderizado al procesar las comandas en tiempo real.
            </p>

            {this.state.error && (
              <div className="bg-gray-50 border border-gray-150 p-4 rounded-2xl mb-8 text-left max-h-32 overflow-y-auto custom-scrollbar relative z-10">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Detalle del Error</p>
                <code className="text-xs font-mono font-bold text-red-600 break-words block">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full bg-gradient-to-r from-red-600 to-orange-500 text-white font-black py-4.5 rounded-2xl text-sm shadow-lg shadow-red-100 hover:shadow-orange-200 transition-all active:scale-95 uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2.5 relative z-10"
            >
              <RotateCcw size={16} strokeWidth={3} />
              Re-Sincronizar Panel
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
