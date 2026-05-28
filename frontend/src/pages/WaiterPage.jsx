import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ShoppingCart, Send, ChevronLeft, Trash2, Plus, Minus, Wine, Utensils, CheckCircle, Clock, Search } from 'lucide-react';

const formatTime = (seconds) => {
  const secs = parseInt(seconds, 10);
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const TableTimer = ({ createdAt, isFinished = false, updatedAt = null }) => {
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (isFinished && updatedAt) {
      const start = new Date(createdAt).getTime();
      const end = new Date(updatedAt).getTime();
      setTimer(Math.max(0, Math.floor((end - start) / 1000)));
      return;
    }

    const calculateTime = () => {
      const start = new Date(createdAt).getTime();
      const now = new Date().getTime();
      setTimer(Math.floor((now - start) / 1000));
    };
    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [createdAt, isFinished, updatedAt]);

  const getTimerColor = () => {
    if (isFinished) return 'text-blue-600 bg-blue-50 border-blue-100';
    if (timer > 900) return 'text-red-600 bg-red-50 border-red-100'; // 15 min
    if (timer > 450) return 'text-yellow-600 bg-yellow-50 border-yellow-100'; // 7.5 min
    return 'text-green-600 bg-green-50 border-green-100';
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${getTimerColor()}`}>
      <Clock size={10} strokeWidth={3} />
      {formatTime(timer)}
      {isFinished && <span className="text-[7px] font-extrabold bg-blue-100 text-blue-700 px-1 rounded-sm ml-0.5">LISTO</span>}
    </span>
  );
};

const WaiterPage = () => {
  const { 
    tables, 
    menu, 
    user, 
    socket, 
    activeOrders, 
    notifications,
    dismissNotification,
    checkoutTable, 
    logout,
    selectedTable,
    setSelectedTable,
    viewMode,
    setViewMode,
    customWaiterName,
    setCustomWaiterName
  } = useStore();

  const [currentOrder, setCurrentOrder] = useState([]);
  const [notes, setNotes] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [floorSelectTable, setFloorSelectTable] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrado inteligente de productos
  const getFilteredProducts = () => {
    if (!searchQuery) {
      const activeCategory = menu.find(c => c.id === activeCategoryId);
      return activeCategory?.products || [];
    }
    // Si hay búsqueda, buscamos en todas las categorías
    return menu.flatMap(cat => 
      cat.products.map(prod => ({ ...prod, categoryName: cat.name }))
    ).filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const displayedProducts = getFilteredProducts();

  // Obtener pedidos activos de la mesa seleccionada y el piso seleccionado
  const tableOrders = activeOrders.filter(o => o.tableId === selectedTable?.id && o.floor === selectedTable?.floor);
  const accountItems = tableOrders.flatMap(o => (o.items || []).map(i => ({ ...i, status: o.status === 'LISTO' ? 'LISTO' : i.status })));
  const accountTotal = tableOrders.reduce((acc, o) => acc + o.total, 0);
  const oldestOrder = tableOrders.reduce((oldest, current) => {
    if (!oldest) return current;
    return new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest;
  }, null);

  const isTableOccupiedOnSelectedFloor = selectedTable && activeOrders.some(o => o.tableId === selectedTable.id && o.floor === selectedTable.floor);
  const tableStatus = isTableOccupiedOnSelectedFloor ? 'OCUPADA' : 'LIBRE';

  useEffect(() => {
    if (menu.length > 0 && !activeCategoryId) {
      setActiveCategoryId(menu[0].id);
    }
  }, [menu]);

  useEffect(() => {
    if (tableStatus === 'OCUPADA') {
      setViewMode('ACCOUNT');
    } else {
      setViewMode('MENU');
    }
  }, [tableStatus]);

  const addToOrder = (product) => {
    if (window.confirm(`¿Agregar "${product.name.trim()}" al pedido?`)) {
      const existing = currentOrder.find(item => item.id === product.id);
      if (existing) {
        updateQuantity(product.id, 1);
      } else {
        setCurrentOrder([...currentOrder, { ...product, quantity: 1, notes: '' }]);
      }
    }
  };

  const updateQuantity = (id, delta) => {
    setCurrentOrder(currentOrder.map(item => 
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const removeFromOrder = (id) => {
    setCurrentOrder(currentOrder.filter(item => item.id !== id));
  };

  const sendOrder = () => {
    if (!selectedTable || currentOrder.length === 0) return;

    const orderData = {
      tableId: selectedTable.id,
      tableNumber: selectedTable.number,
      waiterId: user.id,
      waiterName: customWaiterName || user.name,
      items: currentOrder,
      notes: notes,
      floor: selectedTable.floor
    };

    socket.emit('send_new_order', orderData);
    
    setCurrentOrder([]);
    setNotes('');
  };

  const handleCheckout = () => {
    if (!selectedTable) return;
    checkoutTable(selectedTable.id, selectedTable.floor);
    setSelectedTable(null);
  };

  const total = currentOrder.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  if (user.role === 'MOZO' && !customWaiterName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] animate-in fade-in duration-500">
        <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-xl w-full max-w-md border border-gray-100 text-center">
          <div className="bg-orange-100 p-4.5 rounded-3xl inline-flex mb-5 text-orange-600 shadow-sm">
            <ShoppingCart size={36} className="text-orange-600" />
          </div>
          <h3 className="text-3xl font-black text-gray-800 tracking-tighter uppercase italic mb-2">Registro de Turno</h3>
          <p className="text-gray-500 text-sm mb-8 font-semibold leading-relaxed">Ingresa tu nombre para identificar tus comandas en esta sesión del sistema.</p>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const val = e.target.waiterName.value.trim();
            if (val) setCustomWaiterName(val);
          }} className="space-y-4">
            <input 
              name="waiterName"
              type="text" 
              placeholder="Ej. Luis, María, Grupo A..." 
              autoFocus
              required
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 outline-none transition-all font-black text-center text-lg uppercase placeholder:normal-case placeholder:font-medium text-gray-800"
            />
            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black py-4.5 rounded-2xl text-sm shadow-lg shadow-orange-100 hover:shadow-orange-200 transition-all active:scale-95 uppercase tracking-widest cursor-pointer"
            >
              Iniciar Turno
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeCategory = menu.find(c => c.id === activeCategoryId);

  return (
    <>
      {/* Notifications Overlay */}
      {notifications.length > 0 && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-black/45 backdrop-blur-sm pointer-events-none">
          <div className="w-full max-w-md space-y-4 pointer-events-auto">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-6 rounded-[2rem] shadow-2xl border-4 animate-in zoom-in-95 slide-in-from-top-4 duration-300 ${
                  notif.type === 'ORDER_READY' 
                  ? 'bg-blue-600 border-blue-400 text-white' 
                  : 'bg-green-600 border-green-400 text-white'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80">Notificación de Cocina</p>
                    <h4 className="text-3xl font-black italic tracking-tighter uppercase leading-none mb-2">
                      {notif.type === 'ORDER_READY' ? '¡Pedido Despachado!' : '¡Plato Listo!'}
                    </h4>
                    <p className="text-4xl font-black italic tracking-tighter uppercase mb-2">
                      Mesa {notif.tableNumber} - Piso {notif.floor || 1}
                    </p>
                    {notif.itemName && (
                      <p className="text-xl font-bold uppercase tracking-tight mb-3">
                        {notif.itemName}
                      </p>
                    )}
                    <div className="flex items-center gap-2 bg-black/20 w-fit px-3 py-1.5 rounded-full">
                      <Clock size={16} />
                      <span className="font-mono font-black text-lg">{notif.timeTaken ? formatTime(notif.timeTaken) : '0:00'}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest">Preparación</span>
                    </div>
                  </div>
                  <button
                    onClick={() => dismissNotification(notif.id)}
                    className="bg-white text-black font-black px-8 py-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer uppercase tracking-widest text-sm shrink-0 self-center"
                  >
                    OK
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!selectedTable ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <header className="mb-8">
            <div>
              <h2 className="text-3xl font-black text-gray-800 tracking-tighter uppercase italic">Seleccionar Mesa</h2>
              <p className="text-gray-500 font-medium">Elija una mesa física disponible en cualquiera de los 3 pisos</p>
            </div>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {([...tables].sort((a, b) => a.number - b.number)).map(table => {
              const occupiedFloors = [1, 2, 3].filter(f => 
                activeOrders.some(o => o.tableId === table.id && o.floor === f)
              );
              const isLibre = occupiedFloors.length === 0;

              return (
                <div
                  key={table.id}
                  onClick={() => {
                    setFloorSelectTable(table);
                  }}
                  className={`group relative p-10 rounded-[2.5rem] shadow-sm transition-all hover:shadow-xl active:scale-98 cursor-pointer flex flex-col items-center justify-center select-none ${
                    isLibre 
                    ? 'bg-white text-gray-800 border-2 border-transparent hover:border-green-500 hover:shadow-green-100' 
                    : 'bg-orange-50 text-orange-800 border-2 border-orange-200 hover:border-orange-300'
                  }`}
                >
                  <span className="relative z-10 font-black text-5xl tracking-tighter italic">{table.number}</span>
                  {isLibre ? (
                    <span className="block text-[10px] tracking-[0.2em] font-black mt-2 uppercase text-green-500">
                      LIBRE
                    </span>
                  ) : (
                    <div className="flex flex-col items-center mt-2 gap-1.5 select-none z-10">
                      <div className="flex flex-wrap justify-center gap-1">
                        {occupiedFloors.map(f => (
                          <span key={f} className="text-[9px] bg-orange-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            P. {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`absolute inset-0 rounded-[2.5rem] opacity-0 group-hover:opacity-5 transition-opacity ${isLibre ? 'bg-green-500' : 'bg-orange-500'}`} />
                </div>
              );
            })}
          </div>

          {/* Floor Selection Modal */}
          {floorSelectTable && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full border border-gray-100 p-8 text-center animate-in zoom-in-95 duration-200">
                <h3 className="text-3xl font-black text-gray-800 tracking-tighter uppercase italic mb-1">Mesa {floorSelectTable.number}</h3>
                <p className="text-gray-500 text-sm font-semibold mb-6">¿A qué piso pertenece esta mesa para el pedido?</p>
                
                <div className="space-y-3 mb-6">
                  {[1, 2, 3].map(f => {
                    const isOccupiedOnFloor = activeOrders.some(o => o.tableId === floorSelectTable.id && o.floor === f);
                    const floorOrders = activeOrders.filter(o => o.tableId === floorSelectTable.id && o.floor === f);
                    const floorTotal = floorOrders.reduce((acc, o) => acc + o.total, 0);

                    return (
                      <button
                        key={f}
                        onClick={() => {
                          setSelectedTable({ ...floorSelectTable, floor: f });
                          if (isOccupiedOnFloor) {
                            setViewMode('ACCOUNT');
                          } else {
                            setViewMode('MENU');
                          }
                          setFloorSelectTable(null);
                        }}
                        className={`w-full p-5 rounded-2xl border-2 flex items-center justify-between transition-all hover:scale-[1.02] active:scale-98 cursor-pointer ${
                          isOccupiedOnFloor
                          ? 'bg-orange-50 border-orange-200 text-orange-900 shadow-sm'
                          : 'bg-white border-gray-100 hover:border-green-400 hover:bg-green-50/20 text-gray-800'
                        }`}
                      >
                        <span className="font-black text-xl italic uppercase">Piso {f}</span>
                        {isOccupiedOnFloor ? (
                          <div className="text-right">
                            <span className="inline-block bg-orange-200 text-orange-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mb-1">
                              CON CUENTA
                            </span>
                            <p className="text-base font-black text-orange-700 tracking-tight">S/. {floorTotal.toFixed(2)}</p>
                          </div>
                        ) : (
                          <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                            LIBRE
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setFloorSelectTable(null)}
                  className="w-full bg-gray-100 text-gray-500 font-black py-4.5 rounded-2xl text-xs hover:bg-gray-200 transition-all uppercase tracking-widest cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-140px)] animate-in fade-in slide-in-from-right-4 duration-500 relative">
          <div className="flex-1 flex flex-col min-w-0 lg:h-full">
            {viewMode === 'MENU' ? (
              <>
                <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                  {/* Buscador Moderno */}
                  <div className="relative w-full md:w-80 shrink-0">
                    <input 
                      type="text" 
                      placeholder="Buscar plato o bebida..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-16 py-3.5 bg-white border-2 border-gray-100 rounded-2xl text-sm focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 outline-none transition-all font-black uppercase placeholder:normal-case placeholder:font-semibold text-gray-800"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-100 text-gray-500 hover:bg-gray-200 font-extrabold text-[10px] uppercase tracking-wider px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  {/* Categorías */}
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar w-full md:w-auto">
                    {menu.map(category => (
                      <button
                        key={category.id}
                        onClick={() => {
                          setActiveCategoryId(category.id);
                          setSearchQuery(''); // Limpiar búsqueda al cambiar categoría
                        }}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all text-xs cursor-pointer ${
                          (activeCategoryId === category.id && !searchQuery)
                          ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' 
                          : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
                        }`}
                      >
                        {category.name.toLowerCase().includes('bebida') ? <Wine size={16} /> : <Utensils size={16} />}
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {displayedProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-4">
                      <Search size={48} className="opacity-30" />
                      <div className="text-center">
                        <p className="font-black uppercase tracking-wider text-sm">No se encontraron productos</p>
                        <p className="text-xs text-gray-500 mt-1">Prueba con otro término de búsqueda.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-8">
                      {displayedProducts.map(product => (
                        <button
                          key={product.id}
                          onClick={() => addToOrder(product)}
                          className="group bg-white p-5 rounded-3xl flex flex-col justify-between items-start shadow-sm border border-gray-50 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-50 active:scale-95 transition-all text-left h-40 cursor-pointer"
                        >
                          <div className="w-full">
                            <div className="flex justify-between items-start mb-2 gap-2">
                              <div className="flex flex-col min-w-0">
                                <p className="font-black text-gray-900 text-lg leading-tight uppercase italic truncate">{product.name}</p>
                                {product.categoryName && searchQuery && (
                                  <span className="text-[9px] text-orange-500 font-extrabold uppercase tracking-widest mt-1">
                                    {product.categoryName}
                                  </span>
                                )}
                              </div>
                              <div className="bg-orange-50 p-2.5 rounded-2xl group-hover:bg-orange-600 group-hover:text-white transition-colors shrink-0">
                                <Plus size={22} className="text-orange-600 group-hover:text-white" />
                              </div>
                            </div>
                            {product.size && (
                              <span className="text-xs bg-gray-200/60 px-3 py-1 rounded-full text-gray-900 font-black uppercase tracking-widest mb-2 inline-block">
                                {product.size}
                              </span>
                            )}
                          </div>
                          <p className="text-3xl font-black text-orange-600 tracking-tighter">S/.{product.price.toFixed(2)}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                  <div>
                    <h3 className="text-xl font-black text-gray-800 tracking-tighter uppercase italic">Estado de Cuenta</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest leading-none">Consumo acumulado hasta el momento</p>
                      {oldestOrder && (
                        <div className="flex items-center gap-1.5 z-10">
                          <span className="text-gray-300">•</span>
                          <span className="text-[10px] text-black font-black uppercase tracking-wider">
                            Llegó: {new Date(oldestOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <TableTimer 
                            createdAt={oldestOrder.createdAt} 
                            isFinished={tableOrders.length > 0 && tableOrders.every(o => o.status === 'LISTO')}
                            updatedAt={tableOrders.reduce((latest, current) => {
                              if (!latest) return current.updatedAt || current.createdAt;
                              const curDate = new Date(current.updatedAt || current.createdAt);
                              const latDate = new Date(latest);
                              return curDate > latDate ? (current.updatedAt || current.createdAt) : latest;
                            }, null)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Actual</p>
                    <p className="text-4xl font-black text-gray-900 tracking-tighter">S/.{accountTotal.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                        <th className="pb-4">Cant.</th>
                        <th className="pb-4">Producto</th>
                        <th className="pb-4">Precio</th>
                        <th className="pb-4 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {accountItems.map((item, idx) => (
                        <tr key={idx} className="group">
                          <td className="py-4">
                            <span className="bg-orange-50 text-orange-600 font-black px-3 py-1 rounded-lg text-sm">{item.quantity}</span>
                          </td>
                          <td className="py-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900 uppercase text-sm leading-tight">{item.name}</span>
                              {item.size && <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-md text-gray-600 font-medium uppercase tracking-wider w-fit mt-0.5">{item.size}</span>}
                              {item.status === 'LISTO' && <span className="text-[8px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-black mt-1 inline-block w-fit">LISTO</span>}
                            </div>
                          </td>
                          <td className="py-4 font-bold text-gray-500 text-sm">S/.{item.price.toFixed(2)}</td>
                          <td className="py-4 text-right font-black text-gray-800">S/.{(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-8 py-4 border-t border-gray-100 bg-orange-50/20 shrink-0">
                  <button
                    onClick={() => setViewMode('MENU')}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-100 transition-all active:scale-95 cursor-pointer uppercase tracking-widest text-xs"
                  >
                    <Plus size={16} strokeWidth={3} /> Agregar adicionales a esta mesa (Arroz, Bebidas, Táper, etc.)
                  </button>
                </div>

                <div className="p-8 bg-gray-900 flex justify-between items-center">
                  <div>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Acción Requerida</p>
                    <p className="text-white font-bold italic">Liberar mesa tras el pago</p>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-900/20 hover:bg-orange-500 transition-all active:scale-95 flex items-center gap-3"
                  >
                    <CheckCircle size={18} /> Cerrar Cuenta
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="w-full lg:w-96 bg-white rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col overflow-hidden lg:h-full shrink-0">
            <div className="p-4 sm:p-5 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-800 tracking-tighter uppercase italic">Tu Pedido</h3>
              <div className="bg-orange-600 text-white text-xs font-black px-3 py-1 rounded-full">
                {currentOrder.length} ITEMS
              </div>
            </div>

            {tableStatus === 'OCUPADA' && accountItems.length > 0 && (
              <div className="p-4 sm:p-5 border-b border-gray-100 bg-orange-50/40 max-h-40 overflow-y-auto custom-scrollbar shrink-0">
                <div className="flex justify-between items-center mb-2.5">
                  <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest">En Cocina / Listos</h4>
                  <span className="text-[9px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-black uppercase">
                    {accountItems.filter(i => i.status === 'LISTO').length}/{accountItems.length} LISTOS
                  </span>
                </div>
                <div className="space-y-2.5">
                  {accountItems.map((item, idx) => {
                    const isReady = item.status === 'LISTO';
                    return (
                      <div key={idx} className="flex justify-between items-center text-sm animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 pr-2 min-w-0">
                          <span className={`font-black px-2 py-0.5 rounded text-xs shrink-0 ${
                            isReady ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                          }`}>
                            {item.quantity}
                          </span>
                          <span className={`font-black uppercase italic truncate text-sm ${
                            isReady ? 'text-gray-400 line-through' : 'text-gray-800'
                          }`}>
                            {item.name}
                          </span>
                        </div>
                        {isReady ? (
                          <span className="text-[10px] bg-green-500 text-white px-2.5 py-0.5 rounded-full font-black uppercase shrink-0">
                            LISTO
                          </span>
                        ) : (
                          <span className="text-[10px] bg-yellow-500/20 text-yellow-600 px-2.5 py-0.5 rounded-full font-black uppercase shrink-0 animate-pulse">
                            COCINANDO
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
              {currentOrder.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4 opacity-50">
                  <ShoppingCart size={48} />
                  <p className="font-bold uppercase tracking-widest text-sm">Carrito Vacío</p>
                </div>
              ) : (
                currentOrder.map((item) => (
                  <div key={item.id} className="animate-in fade-in slide-in-from-right-2 duration-300 border-b border-gray-100 pb-3.5 last:border-b-0 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 pr-4">
                        <p className="font-black text-gray-900 leading-tight uppercase text-base italic">{item.name}</p>
                        {item.size && <span className="text-xs bg-gray-200/60 px-2 py-0.5 rounded-md text-gray-900 font-black uppercase tracking-tighter w-fit mt-0.5">{item.size}</span>}
                      </div>
                      <span className="font-black text-gray-900 tracking-tighter text-base">S/.{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-1.5 bg-gray-100 rounded-xl p-1 shrink-0">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded-lg transition-colors"><Minus size={16} /></button>
                        <span className="w-10 text-center font-black text-base">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded-lg transition-colors"><Plus size={16} /></button>
                      </div>
                      
                      {/* Apartado para indicaciones del item (ej. sin ensalada, etc.) */}
                      <input 
                        type="text" 
                        placeholder="Indicaciones: ej. sin ensalada"
                        value={item.notes || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCurrentOrder(currentOrder.map(it => 
                            it.id === item.id ? { ...it, notes: val } : it
                          ));
                        }}
                        className="flex-1 min-w-0 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:bg-white transition-all text-gray-700 font-semibold"
                      />

                      <button onClick={() => removeFromOrder(item.id)} className="text-red-400 hover:text-red-600 p-2 shrink-0"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 shrink-0">
              <div className="mb-2.5">
                <textarea
                  placeholder="¿Alguna indicación especial? (ej. Sin ají)"
                  className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none"
                  rows={1}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              
              <div className="flex justify-between items-center mb-3.5">
                <span className="text-gray-500 font-black uppercase tracking-widest text-sm">Total a pagar</span>
                <span className="text-4xl font-black text-gray-900 tracking-tighter">S/.{total.toFixed(2)}</span>
              </div>

              <button
                onClick={sendOrder}
                disabled={currentOrder.length === 0}
                className="group w-full bg-orange-600 text-white font-black py-4.5 rounded-[1.5rem] flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-orange-100 hover:shadow-orange-200 transition-all active:scale-95 cursor-pointer text-sm"
              >
                <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> 
                <span className="uppercase tracking-widest text-sm">Enviar Pedido</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WaiterPage;
