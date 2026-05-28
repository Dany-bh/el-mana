import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Bell, Utensils, Clock, Trash2, Info, X } from 'lucide-react';

const NotificationToast = ({ notif, onDismiss }) => {
  const duration = notif.type === 'ADMIN_BROADCAST' ? 12000 : 8000; // 12s for admin warnings, 8s for kitchen ready

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notif.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [notif.id, onDismiss, duration]);

  // Styling and content based on notification type
  let bgClass = 'bg-white/95 border-emerald-500/30 text-gray-800 shadow-emerald-100/50';
  let iconClass = 'bg-emerald-500 text-white';
  let progressBg = 'bg-emerald-500';
  let Icon = Utensils;
  let label = 'Plato Listo';
  let titleText = '';
  let descText = '';

  if (notif.type === 'ITEM_READY') {
    bgClass = 'bg-slate-900/98 border-emerald-500/40 text-white shadow-emerald-950/20';
    iconClass = 'bg-emerald-500 text-white animate-bounce';
    progressBg = 'bg-emerald-500';
    Icon = Utensils;
    label = '¡Plato Listo!';
    titleText = `Mesa ${notif.tableNumber} • Piso ${notif.floor || 1}`;
    descText = notif.itemName || 'Un plato está listo para entregar';
  } else if (notif.type === 'ORDER_READY') {
    bgClass = 'bg-slate-900/98 border-blue-500/40 text-white shadow-blue-950/20';
    iconClass = 'bg-blue-500 text-white animate-pulse';
    progressBg = 'bg-blue-500';
    Icon = Bell;
    label = '¡Pedido Despachado!';
    titleText = `Mesa ${notif.tableNumber} • Piso ${notif.floor || 1}`;
    descText = '¡Toda la comanda está lista para retirar!';
  } else if (notif.type === 'ADMIN_BROADCAST') {
    if (notif.broadcastType === 'RESET_DAILY') {
      bgClass = 'bg-amber-950/98 border-amber-500/40 text-amber-50 shadow-amber-950/40';
      iconClass = 'bg-amber-500 text-amber-950';
      progressBg = 'bg-amber-500';
      Icon = Clock;
      label = notif.title || 'Día Reiniciado';
      descText = notif.message;
    } else if (notif.broadcastType === 'PURGE_ALL') {
      bgClass = 'bg-red-950/98 border-red-500/40 text-red-50 shadow-red-950/40';
      iconClass = 'bg-red-500 text-red-950 animate-pulse';
      progressBg = 'bg-red-500';
      Icon = Trash2;
      label = notif.title || 'Sistema Purgado';
      descText = notif.message;
    } else {
      bgClass = 'bg-slate-900/98 border-sky-500/40 text-white shadow-sky-950/20';
      iconClass = 'bg-sky-500 text-white';
      progressBg = 'bg-sky-500';
      Icon = Info;
      label = notif.title || 'Aviso del Sistema';
      descText = notif.message;
    }
  }

  return (
    <div 
      className={`relative w-full max-w-sm rounded-[1.8rem] border-2 backdrop-blur-md p-5 shadow-2xl flex gap-4 pointer-events-auto transition-all duration-300 hover:scale-[1.02] animate-in slide-in-from-right-10 duration-500 select-none ${bgClass}`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${iconClass}`}>
        <Icon size={22} strokeWidth={2.5} />
      </div>
      
      <div className="flex-1 pr-6">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">{label}</p>
        {titleText && <h4 className="text-lg font-black tracking-tight uppercase italic leading-tight mb-1">{titleText}</h4>}
        <p className="text-xs font-semibold leading-relaxed opacity-90">{descText}</p>
        
        {notif.timeTaken && (
          <div className="flex items-center gap-1 mt-2 text-[10px] font-mono opacity-65 bg-white/5 w-fit px-2 py-0.5 rounded-full">
            <Clock size={10} />
            <span>Listo en {Math.floor(notif.timeTaken / 60)}m {notif.timeTaken % 60}s</span>
          </div>
        )}
      </div>

      <button 
        onClick={() => onDismiss(notif.id)}
        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 cursor-pointer"
      >
        <X size={16} strokeWidth={3} />
      </button>

      {/* Progress Bar indicator */}
      <div className="absolute bottom-0 left-5 right-5 h-1 bg-white/15 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${progressBg} animate-shrink-width`}
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  );
};

export const GlobalNotifications = () => {
  const { notifications, dismissNotification } = useStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 left-6 sm:left-auto z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full md:w-96">
      {notifications.map((notif) => (
        <NotificationToast 
          key={notif.id} 
          notif={notif} 
          onDismiss={dismissNotification} 
        />
      ))}
    </div>
  );
};
