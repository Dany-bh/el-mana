import { create } from 'zustand';
import { io } from 'socket.io-client';
import api from '../services/api';

const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const playSynthNotification = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    
    const playNote = (frequency, startTime, duration, type = 'sine') => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, startTime);
      
      gainNode.gain.setValueAtTime(0.7, startTime); // Louder chime
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    const now = audioCtx.currentTime;
    // Lindo arpegio llamativo y fuerte para el mozo
    playNote(587.33, now, 0.15, 'triangle'); // D5
    playNote(659.25, now + 0.15, 0.15, 'triangle'); // E5
    playNote(880.00, now + 0.30, 0.40, 'sine'); // A5
  } catch (error) {
    console.log("AudioContext blocked or not supported", error);
  }
};

const playSynthPip = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    
    const playNote = (frequency, startTime, duration, type = 'sawtooth') => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, startTime);
      
      gainNode.gain.setValueAtTime(0.8, startTime); // Very loud buzzy sound for noisy kitchen!
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    const now = audioCtx.currentTime;
    // 3 zumbidos secos y potentes similares a una ticketera física
    playNote(987.77, now, 0.08, 'sawtooth');
    playNote(987.77, now + 0.12, 0.08, 'sawtooth');
    playNote(987.77, now + 0.24, 0.15, 'sawtooth');
  } catch (error) {
    console.log("AudioContext blocked or not supported", error);
  }
};

export const useStore = create((set, get) => ({
  user: null, // { id, name, role, pin }
  customWaiterName: null, // Nombre de mozo personalizado
  socket: null,
  tables: [],
  menu: [],
  activeOrders: [],
  notifications: [],
  selectedTable: null,
  viewMode: 'MENU',
  setSelectedTable: (selectedTable) => set({ selectedTable }),
  setViewMode: (viewMode) => set({ viewMode }),
  setCustomWaiterName: async (name) => {
    set({ customWaiterName: name });
    sessionStorage.setItem('el_mana_custom_waiter_name', name);
    const { user } = get();
    if (user) {
      try {
        await api.post('/api/auth/update-name', { userId: user.id, name });
      } catch (err) {
        console.error("Error updating waiter name in database:", err);
      }
    }
  },

  dismissNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),

  login: (userData) => {
    const { socket: existingSocket } = get();
    if (existingSocket) existingSocket.disconnect();

    const socket = io(socketUrl, {
      auth: {
        role: userData.role,
        userId: userData.id
      }
    });

    set({ user: userData, socket });
    sessionStorage.setItem('el_mana_user', JSON.stringify(userData));

    socket.on('kitchen_new_order', (order) => {
      set((state) => ({ activeOrders: [...state.activeOrders, order] }));
      if (userData.role === 'COCINA') {
        playSynthPip();
      }
    });

    socket.on('notify_waiter_ready', (data) => {
      set((state) => ({
        notifications: [...state.notifications, data]
      }));
      playSynthNotification();
    });

    socket.on('admin_action_broadcast', (data) => {
      set((state) => ({
        notifications: [...state.notifications, {
          id: Date.now() + Math.random(),
          type: 'ADMIN_BROADCAST',
          broadcastType: data.type,
          title: data.title,
          message: data.message
        }]
      }));
      playSynthNotification();

      if (data.type === 'RESET_DAILY' || data.type === 'PURGE_ALL') {
        set((state) => ({
          activeOrders: [],
          selectedTable: null,
          tables: state.tables.map(t => ({ ...t, status: 'LIBRE' }))
        }));
      } else if (data.type === 'CLEAR_KITCHEN') {
        set((state) => ({
          activeOrders: state.activeOrders.filter(o => o.status !== 'LISTO')
        }));
      }
    });

    socket.on('order_status_updated', ({ orderId, status, updatedAt }) => {
      set((state) => ({
        activeOrders: state.activeOrders.map(o => {
          if (o.id === orderId) {
            return {
              ...o,
              status,
              updatedAt: updatedAt || o.updatedAt,
              items: (o.items || []).map(i => ({ ...i, status }))
            };
          }
          return o;
        })
      }));
    });

    socket.on('order_item_status_updated', ({ orderId, itemId, itemStatus, orderStatus, updatedAt }) => {
      set((state) => ({
        activeOrders: state.activeOrders.map(o => {
          if (o.id === orderId) {
            return {
              ...o,
              status: orderStatus,
              updatedAt: updatedAt || o.updatedAt,
              items: (o.items || []).map(i => i.id === itemId ? { ...i, status: itemStatus } : i)
            };
          }
          return o;
        })
      }));
    });

    socket.on('table_status_updated', ({ tableId, status }) => {
      set((state) => ({
        tables: state.tables.map(t => t.id === tableId ? { ...t, status } : t)
      }));
    });

    socket.on('table_checked_out', ({ tableId, floor }) => {
      set((state) => {
        const remainingOrders = state.activeOrders.filter(o => !(o.tableId === tableId && o.floor === floor));
        const hasActiveOrders = remainingOrders.some(o => o.tableId === tableId);
        return {
          activeOrders: remainingOrders,
          tables: state.tables.map(t => t.id === tableId ? { ...t, status: hasActiveOrders ? 'OCUPADA' : 'LIBRE' } : t)
        };
      });
    });

    socket.on('menu_updated', (newMenu) => {
      set({ menu: newMenu });
    });
  },

  logout: async () => {
    const { socket, user } = get();
    if (socket) socket.disconnect();
    if (user && user.role === 'MOZO') {
      try {
        await api.post('/api/auth/update-name', { userId: user.id, name: 'Mozo' });
      } catch (err) {
        console.error("Error resetting waiter name in database:", err);
      }
    }
    sessionStorage.removeItem('el_mana_user');
    sessionStorage.removeItem('el_mana_custom_waiter_name');
    set({ user: null, socket: null, selectedTable: null, viewMode: 'MENU', customWaiterName: null });
  },

  restoreSession: async () => {
    const savedUser = sessionStorage.getItem('el_mana_user');
    const savedCustomName = sessionStorage.getItem('el_mana_custom_waiter_name');
    if (savedCustomName) {
      set({ customWaiterName: savedCustomName });
    }
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        if (!get().user) {
          get().login(userData);
        }
        // Sincronizar nombre con la BD si existe el nombre temporal
        if (userData.role === 'MOZO' && savedCustomName) {
          api.post('/api/auth/update-name', { userId: userData.id, name: savedCustomName }).catch(err => {
            console.error("Error syncing waiter name in restoreSession:", err);
          });
        }
      } catch (e) {
        console.error("Error restoring session:", e);
        sessionStorage.removeItem('el_mana_user');
        sessionStorage.removeItem('el_mana_custom_waiter_name');
      }
    }
  },

  setTables: (tables) => set({ tables }),
  setMenu: (menu) => set({ menu }),
  setActiveOrders: (activeOrders) => set({ activeOrders }),
  
  markOrderReady: (orderId) => {
    const { socket, activeOrders } = get();
    const order = activeOrders.find(o => o.id === orderId);
    if (socket && order) {
      socket.emit('mark_order_ready', {
        orderId,
        waiterId: order.waiterId,
        tableNumber: order.tableNumber
      });
      // Local update: mark order and all its items as ready
      set({
        activeOrders: activeOrders.map(o => {
          if (o.id === orderId) {
            return {
              ...o,
              status: 'LISTO',
              items: (o.items || []).map(i => ({ ...i, status: 'LISTO' }))
            };
          }
          return o;
        })
      });
    }
  },

  markItemReady: (orderId, itemId) => {
    const { socket, activeOrders } = get();
    const order = activeOrders.find(o => o.id === orderId);
    if (socket && order) {
      socket.emit('mark_item_ready', {
        orderId,
        itemId,
        waiterId: order.waiterId,
        tableNumber: order.tableNumber
      });
      // Local update: mark specific item as ready
      set({
        activeOrders: activeOrders.map(o => {
          if (o.id === orderId) {
            return {
              ...o,
              items: (o.items || []).map(i => i.id === itemId ? { ...i, status: 'LISTO' } : i)
            };
          }
          return o;
        })
      });
    }
  },

  unreadyOrder: (orderId) => {
    const { socket, activeOrders } = get();
    if (socket) {
      socket.emit('unready_order', { orderId });
      set({
        activeOrders: activeOrders.map(o => {
          if (o.id === orderId) {
            return {
              ...o,
              status: 'PENDIENTE',
              items: (o.items || []).map(i => {
                const cat = (i.categoryName || "").toLowerCase();
                const name = (i.name || "").toLowerCase();
                const isFood = !cat.includes('bebida') && !cat.includes('taper') && !cat.includes('envase') && !name.includes('taper') && !name.includes('táper') && !name.includes('envase');
                return isFood ? { ...i, status: 'PENDIENTE' } : i;
              })
            };
          }
          return o;
        })
      });
    }
  },

  unreadyItem: (orderId, itemId) => {
    const { socket, activeOrders } = get();
    if (socket) {
      socket.emit('unready_item', { orderId, itemId });
      set({
        activeOrders: activeOrders.map(o => {
          if (o.id === orderId) {
            return {
              ...o,
              status: 'PENDIENTE',
              items: (o.items || []).map(i => i.id === itemId ? { ...i, status: 'PENDIENTE' } : i)
            };
          }
          return o;
        })
      });
    }
  },

  checkoutTable: async (tableId, floor) => {
    try {
      await api.post(`/api/tables/${tableId}/checkout`, { floor });
      set((state) => {
        const remainingOrders = state.activeOrders.filter(o => !(o.tableId === tableId && o.floor === floor));
        const hasActiveOrders = remainingOrders.some(o => o.tableId === tableId);
        return {
          activeOrders: remainingOrders,
          tables: state.tables.map(t => t.id === tableId ? { ...t, status: hasActiveOrders ? 'OCUPADA' : 'LIBRE' } : t)
        };
      });
    } catch (error) {
      console.error("Error checking out:", error);
    }
  }
}));
