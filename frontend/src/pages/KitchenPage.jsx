import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import api from '../services/api';
import { Clock, CheckCircle, Flame, AlertCircle, RotateCcw } from 'lucide-react';

const isFoodItem = (item) => {
  const cat = (item.categoryName || "").toLowerCase();
  const name = (item.name || "").toLowerCase();
  return (
    !cat.includes('bebida') && 
    !cat.includes('taper') && 
    !cat.includes('envase') && 
    !name.includes('taper') && 
    !name.includes('táper') && 
    !name.includes('envase')
  );
};

const OrderCard = ({ order, isHistory = false }) => {
  const { markOrderReady, markItemReady, unreadyOrder, unreadyItem } = useStore();
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (order.status === 'LISTO') {
      const start = new Date(order.createdAt).getTime();
      const end = new Date(order.updatedAt || order.createdAt).getTime();
      setTimer(Math.max(0, Math.floor((end - start) / 1000)));
      return;
    }

    const calculateTime = () => {
      const start = new Date(order.createdAt).getTime();
      const now = new Date().getTime();
      setTimer(Math.floor((now - start) / 1000));
    };
    calculateTime();

    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [order.createdAt, order.status, order.updatedAt]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getTimerColor = () => {
    if (timer > 900) return 'text-red-500 bg-red-500/10 border-red-500/20'; // 15m
    if (timer > 450) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'; // 7.5m
    return 'text-green-500 bg-green-500/10 border-green-500/20';
  };

  return (
    <div className="bg-[#1a1d23] rounded-3xl overflow-hidden border-2 border-[#2d323a] shadow-2xl animate-in zoom-in-95 duration-300">
      {/* Ticket Header */}
      <div className="p-6 border-b-2 border-[#2d323a] bg-[#22272e] flex justify-between items-center">
        <div>
          <h3 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">MESA {order.tableNumber}</h3>
          <span className="inline-block bg-[#2d323a] text-orange-500 font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded mt-2.5">
            PISO {order.floor || 1}
          </span>
          <p className="text-xs text-gray-400 uppercase font-black tracking-[0.25em] mt-2">{order.waiterName || "MOZO"}</p>
        </div>
        <div className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border-2 font-mono text-3xl font-black transition-colors ${getTimerColor()}`}>
          <Clock size={24} />
          {formatTime(timer)}
        </div>
      </div>
      
      {/* Ticket Body */}
      <div className="p-7 relative">
        {/* Jagged Edge Simulation */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[linear-gradient(45deg,transparent_33.33%,#2d323a_33.33%,#2d323a_66.66%,transparent_66.66%)] bg-[length:12px_12px] opacity-20" />
        
        <ul className="space-y-5 mb-8">
          {order.items.filter(isFoodItem).map((item, idx) => {
            const isItemReady = item.status === 'LISTO';
            return (
              <li key={idx} className="group flex flex-col border-b border-[#2d323a]/40 pb-4 last:border-b-0 last:pb-0">
                <div className="flex justify-between items-center gap-4">
                  <div className="flex items-start gap-4">
                    <span className={`flex items-center justify-center w-12 h-12 rounded-xl font-black text-xl transition-colors shrink-0 ${
                      isItemReady 
                        ? 'bg-gray-800 text-gray-500' 
                        : 'bg-orange-600/20 text-orange-500 border border-orange-500/30'
                    }`}>
                      {item.quantity}
                    </span>
                    <div className="flex flex-col">
                      <span className={`font-black text-2xl leading-tight transition-all uppercase italic tracking-tight ${
                        isItemReady 
                          ? 'text-gray-500 line-through' 
                          : 'text-gray-100'
                      }`}>
                        {item.name}
                      </span>
                      {item.size && (
                        <span className={`text-xs font-black uppercase tracking-widest mt-0.5 ${
                          isItemReady ? 'text-gray-600 line-through' : 'text-gray-200'
                        }`}>{item.size}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {timer > 600 && !isItemReady && <Flame size={20} className="text-orange-500 animate-pulse" />}
                    {isItemReady ? (
                      <button
                        onClick={() => unreadyItem(order.id, item.id)}
                        className="text-xs bg-green-500/10 text-green-500 hover:bg-orange-500/10 hover:text-orange-500 px-4 py-1.5 rounded-full font-black uppercase tracking-widest border border-green-500/30 hover:border-orange-500/30 cursor-pointer flex items-center gap-1 transition-all"
                        title="Deshacer listo (Regresar a cocina)"
                      >
                        LISTO
                      </button>
                    ) : (
                      <button
                        onClick={() => markItemReady(order.id, item.id)}
                        className="p-3 bg-gray-800 text-gray-300 hover:text-green-400 hover:bg-green-500/10 rounded-xl transition-all border border-gray-700/50 hover:border-green-500/30 active:scale-90 cursor-pointer"
                        title="Marcar este plato como listo"
                      >
                        <CheckCircle size={22} />
                      </button>
                    )}
                  </div>
                </div>
                {item.notes && (
                  <div className={`mt-2.5 ml-16 flex items-start gap-2.5 p-3 rounded-2xl border-2 italic text-sm font-bold transition-colors ${
                    isItemReady 
                      ? 'text-gray-600 bg-gray-800/10 border-gray-800/20' 
                      : 'text-yellow-500 bg-yellow-500/5 border-yellow-500/20'
                  }`}>
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    {item.notes}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        
        {order.notes && (
          <div className="bg-red-500/5 p-5 rounded-2xl mb-8 border-2 border-red-500/20">
            <p className="text-xs font-black text-red-500 uppercase tracking-widest mb-1.5">Nota del Pedido:</p>
            <p className="text-base text-gray-200 italic font-bold">"{order.notes}"</p>
          </div>
        )}
 
        {isHistory ? (
          <button
            onClick={() => unreadyOrder(order.id)}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-6 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-orange-950/40 uppercase tracking-widest text-base cursor-pointer"
          >
            <RotateCcw size={24} /> Regresar a Cocina
          </button>
        ) : (
          <button
            onClick={() => markOrderReady(order.id)}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-6 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-green-950/40 uppercase tracking-widest text-base cursor-pointer"
          >
            <CheckCircle size={24} /> Despachar Todo
          </button>
        )}
      </div>
    </div>
  );
};

const KitchenPage = () => {
  const { activeOrders } = useStore();
  const [viewMode, setViewMode] = useState('QUEUE'); // 'QUEUE' or 'HISTORY'
  const [confirmAction, setConfirmAction] = useState(null);

  const pendingOrders = activeOrders.filter(o => o.status === 'PENDIENTE' && o.items.some(isFoodItem));
  const dispatchedOrders = activeOrders.filter(o => o.status === 'LISTO' && o.items.some(isFoodItem));

  const displayOrders = viewMode === 'QUEUE' ? pendingOrders : dispatchedOrders;

  return (
    <div className="min-h-[calc(100vh-140px)] animate-in fade-in duration-700">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tighter uppercase italic">
            {viewMode === 'QUEUE' ? 'Cola de Producción' : 'Historial de Despachados'}
          </h2>
          <p className="text-gray-500 font-medium">
            {viewMode === 'QUEUE' ? 'Gestiona y despacha los pedidos activos' : 'Revisa y recupera comandas despachadas en la sesión'}
          </p>
        </div>
        
        {/* Selector de Vistas y Contadores */}
        <div className="flex items-center gap-4 w-full sm:w-auto flex-wrap">
          {viewMode === 'HISTORY' && dispatchedOrders.length > 0 && (
            <button
              onClick={() => {
                setConfirmAction({
                  title: '¿Limpiar Historial?',
                  message: '¿Estás seguro de limpiar el historial de cocina? Se borrarán permanentemente todos los registros de platos despachados.',
                  isDangerous: true,
                  onConfirm: async () => {
                    try {
                      await api.post('/api/admin/clear-kitchen-history');
                    } catch (err) {
                      alert('Error al limpiar historial');
                    }
                  }
                });
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white"
            >
              Limpiar Historial
            </button>
          )}
          <div className="flex bg-[#1a1d23] border border-[#2d323a] p-1.5 rounded-2xl shadow-xl">
            <button
              onClick={() => setViewMode('QUEUE')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'QUEUE'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Cola ({pendingOrders.length})
            </button>
            <button
              onClick={() => setViewMode('HISTORY')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'HISTORY'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Historial ({dispatchedOrders.length})
            </button>
          </div>
        </div>
      </header>
      
      {displayOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-gray-600 animate-pulse">
          <div className="bg-[#1a1d23] p-10 rounded-[3rem] border border-[#2d323a] shadow-inner mb-6">
            <CheckCircle size={64} className="opacity-20" />
          </div>
          <p className="text-xl font-black uppercase tracking-widest italic">
            {viewMode === 'QUEUE' ? 'Cocina al día' : 'Historial vacío'}
          </p>
          <p className="text-sm font-medium">
            {viewMode === 'QUEUE' ? 'Esperando nuevos pedidos...' : 'No hay pedidos despachados recientemente'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
          {displayOrders.map(order => (
            <OrderCard key={order.id} order={order} isHistory={viewMode === 'HISTORY'} />
          ))}
        </div>
      )}

      {/* Custom Kitchen Action Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1a1d23] rounded-[2.5rem] shadow-2xl max-w-sm w-full border-2 border-[#2d323a] p-8 text-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
            {/* Ambient decoration */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-red-500/5 rounded-full" />
            
            <div className="p-4.5 rounded-3xl inline-flex mb-5 border-2 border-red-500/20 bg-red-500/10 text-red-500 shadow-sm animate-bounce">
              <AlertCircle size={32} />
            </div>
            
            <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic mb-2">
              {confirmAction.title}
            </h3>
            <p className="text-gray-400 text-sm font-semibold mb-6 leading-relaxed">
              {confirmAction.message}
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 bg-[#22272e] text-gray-400 hover:text-white border border-[#2d323a] font-black py-4 rounded-2xl text-xs hover:bg-[#2d323a] transition-all uppercase tracking-widest cursor-pointer active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-500 text-white font-black py-4 rounded-2xl text-xs shadow-lg shadow-red-950/40 hover:shadow-red-900 transition-all active:scale-95 uppercase tracking-widest cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenPage;
