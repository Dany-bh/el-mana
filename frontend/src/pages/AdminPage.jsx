import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, Package, Layout, Users, Tag, Search, X, Save, AlertCircle, ChevronRight, TrendingUp, Activity, Printer, FileText, CheckCircle, Clock } from 'lucide-react';
import { Button } from '../components/Button';
import { Input, Select, TextArea } from '../components/Input';
import { Modal } from '../components/Modal';
import { Card, CardBody, CardHeader, CardFooter } from '../components/Card';
import { Badge } from '../components/Badge';
import { useStore } from '../store/useStore';

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

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

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

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('live');
  const [selectedPastOrder, setSelectedPastOrder] = useState(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);
  const [editingType, setEditingType] = useState(''); // 'products', 'categories', 'tables', 'users'
  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [salesData, setSalesData] = useState({ totalSales: 0, totalOrdersCount: 0, completedOrders: [], productSales: [] });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    fetchData();
    if (activeTab === 'products' || activeTab === 'categories') {
      fetchCategories();
    }
  }, [activeTab]);

  const fetchData = async () => {
    if (activeTab === 'live') return;
    setLoading(true);
    try {
      // Add a timestamp to prevent caching
      const res = await api.get(`/api/admin/${activeTab}?t=${Date.now()}`);
      if (activeTab === 'sales') {
        setSalesData(res.data);
      } else {
        setData(res.data);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const res = await api.get(`/api/admin/categories?t=${Date.now()}`);
    setCategories(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      
      // Client-side duplicate check (with whitespace normalization)
      if (editingType === 'products') {
        const normalizedNewName = submitData.name?.trim().replace(/\s+/g, ' ').toLowerCase();
        const duplicate = data.find(p => p.name?.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedNewName && (!editingItem || p.id !== editingItem.id));
        if (duplicate) {
          alert("Ya existe un producto con este nombre en el menú.");
          return;
        }
      }
      
      if (editingType === 'categories') {
        const normalizedNewName = submitData.name?.trim().replace(/\s+/g, ' ').toLowerCase();
        const duplicate = data.find(c => c.name?.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedNewName && (!editingItem || c.id !== editingItem.id));
        if (duplicate) {
          alert("Ya existe una categoría con este nombre.");
          return;
        }
      }

      if (editingType === 'products') {
        if (!submitData.categoryId) {
          submitData.categoryId = categories[0]?.id || '';
        }
        // Auto-clear size if not a beverage
        const selectedCat = categories.find(c => c.id === submitData.categoryId);
        const isBeverage = selectedCat && selectedCat.name.toLowerCase().includes('bebida');
        if (!isBeverage) {
          submitData.size = null;
        }
      }

      if (editingItem) {
        await api.put(`/api/admin/${editingType}/${editingItem.id}`, submitData);
      } else {
        await api.post(`/api/admin/${editingType}`, submitData);
      }
      setIsModalOpen(false);
      fetchData();
      if (activeTab === 'categories') {
        fetchCategories();
      }
    } catch (error) {
      const errMsg = error.response?.data?.error || "Error al guardar datos";
      alert(errMsg);
    }
  };

  const handleDelete = (id) => {
    setConfirmAction({
      title: '¿Eliminar Registro?',
      message: '¿Estás seguro de eliminar este elemento? Asegúrate de que no tenga otros elementos asociados (como productos o pedidos).',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/admin/${activeTab}/${id}`);
          fetchData();
          if (activeTab === 'categories') {
            fetchCategories();
          }
        } catch (error) {
          console.error("Delete error:", error);
          const msg = error.response?.data?.error || "No se pudo eliminar el elemento. Asegúrate de que no tenga otros elementos asociados (como productos o pedidos).";
          alert(msg);
        }
      }
    });
  };

  const handleDeleteProduct = (id) => {
    setConfirmAction({
      title: '¿Eliminar Producto?',
      message: '¿Estás seguro de eliminar este producto del menú? Se borrará de forma permanente.',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/admin/products/${id}`);
          fetchCategories();
          fetchData();
        } catch (error) {
          console.error("Delete error:", error);
          alert(error.response?.data?.error || "Error al eliminar producto");
        }
      }
    });
  };

  const openModal = (item = null, type = activeTab, defaultFields = {}) => {
    setEditingItem(item);
    setEditingType(type);
    setFormData(item ? { ...item } : { ...getDefaultFormData(type), ...defaultFields });
    setIsModalOpen(true);
  };

  const getDefaultFormData = (type = activeTab) => {
    if (type === 'products') return { name: '', size: '', price: 0, categoryId: categories[0]?.id || '' };
    if (type === 'tables') return { number: '', floor: 1, status: 'LIBRE' };
    if (type === 'categories') return { name: '' };
    if (type === 'users') return { name: '', pin: '', role: 'MOZO' };
    return {};
  };

  const filteredData = data.filter(item => {
    const name = item.name || `Mesa ${item.number}` || '';
    return name.toString().toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredCategories = categories.filter(category => {
    const catMatches = category.name.toLowerCase().includes(searchTerm.toLowerCase());
    const hasMatchingProduct = category.products?.some(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.size && product.size.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    return catMatches || hasMatchingProduct;
  });

  const sidebarItems = [
    { id: 'live', label: 'Monitoreo en tiempo real', icon: Activity },
    { id: 'categories', label: 'Categorías / Menú', icon: Tag },
    { id: 'tables', label: 'Mesas', icon: Layout },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'sales', label: 'Caja / Ventas', icon: TrendingUp },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-[calc(100vh-140px)] animate-in fade-in duration-500">
      {/* Sidebar Admin */}
      <div className="w-full lg:w-72 shrink-0">
        <div className="bg-white rounded-3xl lg:rounded-[2rem] shadow-sm border border-gray-100 p-2.5 lg:p-4 flex flex-row lg:flex-col gap-2 overflow-x-auto no-scrollbar">
          <p className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 hidden lg:block">Administración</p>
          {sidebarItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSearchTerm(''); }}
              className={`flex items-center justify-between p-3.5 lg:p-4 rounded-2xl font-black transition-all text-xs lg:text-sm whitespace-nowrap shrink-0 lg:w-full ${
                activeTab === item.id 
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' 
                : 'text-gray-500 hover:bg-orange-50 hover:text-orange-600'
              }`}
            >
              <div className="flex items-center gap-2.5 lg:gap-3">
                <item.icon size={18} />
                <span>{item.label}</span>
              </div>
              {activeTab === item.id && <ChevronRight size={16} className="hidden lg:block" />}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {activeTab === 'sales' ? (
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-500">
            {/* Header de Caja */}
            <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/20">
              <div>
                <h2 className="text-3xl font-black text-gray-800 tracking-tighter uppercase italic">Resumen de Caja</h2>
                <p className="text-gray-500 font-medium text-sm">Resumen consolidado de ventas y productos facturados</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => setConfirmAction({
                    title: '¿Reiniciar caja del día?',
                    message: 'Se archivará y limpiará la caja actual de este turno. Los productos y las mesas no se verán afectados.',
                    isDangerous: false,
                    onConfirm: async () => {
                      try {
                        await api.post(`/api/admin/reset-daily`);
                        await fetchData();
                      } catch (err) {
                        alert('Error al reiniciar caja');
                      }
                    }
                  })}
                  className="bg-white text-gray-800 border-2 border-gray-100 px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-2xl flex items-center justify-center gap-1.5 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all font-black text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest active:scale-95 cursor-pointer flex-1 sm:flex-none whitespace-nowrap"
                >
                  <Clock size={14} /> Reiniciar Día
                </button>
                <button 
                  onClick={() => setConfirmAction({
                    title: '¿ELIMINAR TODO EL HISTORIAL?',
                    message: 'Esta acción borrará permanentemente todos los reportes y registros de ventas pasadas de la base de datos. No se puede deshacer.',
                    isDangerous: true,
                    onConfirm: async () => {
                      try {
                        await api.post(`/api/admin/purge-all-history`);
                        await fetchData();
                      } catch (err) {
                        alert('Error al eliminar historial');
                      }
                    }
                  })}
                  className="bg-white text-red-600 border-2 border-red-100 px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-2xl flex items-center justify-center gap-1.5 hover:bg-red-600 hover:text-white transition-all font-black text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest active:scale-95 cursor-pointer flex-1 sm:flex-none whitespace-nowrap"
                >
                  <Trash2 size={14} /> Borrar Todo
                </button>
                <button 
                  onClick={fetchData}
                  className="bg-gray-900 text-white px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-2xl flex items-center justify-center gap-1.5 hover:bg-orange-600 transition-all font-black text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest shadow-lg active:scale-95 cursor-pointer flex-1 sm:flex-none whitespace-nowrap"
                >
                  Actualizar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {/* KPIs Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-3xl text-white shadow-xl shadow-orange-100">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Ingresos Totales (Caja)</p>
                  <p className="text-4xl font-black tracking-tighter">S/.{salesData.totalSales.toFixed(2)}</p>
                  <p className="text-[10px] font-medium opacity-80 mt-2">Recaudación acumulada de pedidos</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Pedidos Cobrados</p>
                    <p className="text-4xl font-black text-gray-900 tracking-tighter">{salesData.totalOrdersCount}</p>
                  </div>
                  <p className="text-[10px] font-bold text-green-600 mt-2">Transacciones finalizadas con éxito</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ticket Promedio</p>
                    <p className="text-4xl font-black text-gray-900 tracking-tighter">
                      S/.{(salesData.totalSales / (salesData.totalOrdersCount || 1)).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-[10px] font-bold text-orange-600 mt-2">Gasto promedio por mesa</p>
                </div>
              </div>

              {/* Detalle en dos columnas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Ranking de Productos */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col">
                   <div className="mb-4">
                     <h3 className="text-lg font-black text-gray-800 tracking-wide uppercase italic">Ranking de Productos</h3>
                     <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Los platos y bebidas más vendidos</p>
                   </div>
                   <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2 flex-1">
                     {salesData.productSales.length === 0 ? (
                       <p className="text-gray-400 text-sm py-10 text-center font-bold uppercase tracking-widest">No hay platos vendidos aún</p>
                     ) : (
                       salesData.productSales.map((product, idx) => (
                         <div key={idx} className="flex justify-between items-center p-3 rounded-2xl hover:bg-orange-50/30 transition-colors">
                           <div className="flex items-center gap-3">
                             <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs">
                               {idx + 1}
                             </span>
                             <div>
                               <p className="font-bold text-gray-800 uppercase italic text-sm">{product.name}</p>
                               {product.size && <span className="text-xs bg-gray-200/60 px-2 py-0.5 rounded-md text-gray-900 font-black uppercase tracking-tighter">{product.size}</span>}
                             </div>
                           </div>
                           <div className="text-right">
                             <p className="font-black text-gray-800 text-sm">{product.quantity} u.</p>
                             <p className="text-xs text-orange-600 font-black tracking-tighter">S/.{product.total.toFixed(2)}</p>
                           </div>
                         </div>
                       ))
                     )}
                   </div>
                 </div>

                 {/* Pedidos Finalizados (Historial) */}
                 <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col">
                   <div className="mb-4">
                     <h3 className="text-lg font-black text-gray-800 tracking-wide uppercase italic">Historial de Ventas</h3>
                     <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Últimos cobros registrados en caja</p>
                   </div>
                  <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2 flex-1">
                    {salesData.completedOrders.length === 0 ? (
                      <p className="text-gray-400 text-sm py-10 text-center font-bold uppercase tracking-widest">No hay ventas registradas</p>
                    ) : (
                      salesData.completedOrders.map((order, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 rounded-2xl hover:bg-orange-50/30 transition-colors border-b border-gray-50">
                          <div>
                            <p className="font-bold text-gray-800 uppercase italic text-sm">Mesa {order.tableNumber}</p>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Cobrado por {order.waiterName}</p>
                          </div>
                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <p className="font-black text-gray-900 text-sm">S/.{order.total.toFixed(2)}</p>
                              <p className="text-[9px] text-gray-400 font-bold">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                            <button
                              onClick={() => setSelectedPastOrder(order)}
                              className="p-2.5 bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                              title="Ver detalle del consumo"
                            >
                              <FileText size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'live' ? (
          <LiveMonitor setConfirmAction={setConfirmAction} />
        ) : (
          <>
            <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-3xl font-black text-gray-800 tracking-tighter uppercase italic">
                  {activeTab === 'products' ? 'Productos' :
                   activeTab === 'users' ? 'Usuarios' :
                   activeTab === 'categories' ? 'Categorías' :
                   activeTab === 'tables' ? 'Mesas' : activeTab}
                </h2>
                <p className="text-gray-500 font-medium text-sm">
                  Gestionar registros de {activeTab === 'products' ? 'productos' :
                   activeTab === 'users' ? 'usuarios' :
                   activeTab === 'categories' ? 'categorías' :
                   activeTab === 'tables' ? 'mesas' : activeTab}
                </p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar..." 
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => openModal()}
                  className="bg-gray-900 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-orange-600 transition-all font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 cursor-pointer"
                >
                  <Plus size={18} /> Nuevo
                </button>
              </div>
            </div>

            {activeTab === 'categories' ? (
              <div className="flex-1 overflow-auto custom-scrollbar p-6 space-y-4">
                {filteredCategories.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest">
                    No se encontraron categorías
                  </div>
                ) : (
                  filteredCategories.map((category) => {
                    const isExpanded = expandedCategoryId === category.id;
                    const matchingProducts = category.products?.filter(product => {
                      if (!searchTerm) return true;
                      return product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (product.size && product.size.toLowerCase().includes(searchTerm.toLowerCase()));
                    }) || [];
                    
                    return (
                      <div key={category.id} className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm transition-all hover:border-orange-200">
                        {/* Cabecera del Acordeón */}
                        <div 
                          onClick={() => setExpandedCategoryId(isExpanded ? null : category.id)}
                          className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 font-black shrink-0">
                              <Tag size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="font-bold text-gray-800 uppercase italic text-lg leading-none">{category.name}</h3>
                                <span className="text-[10px] bg-orange-50 font-black text-orange-600 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                  {category.products?.length || 0} Prod.
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 font-medium mt-1">
                                {isExpanded ? 'Haz clic para contraer' : 'Haz clic para ver productos'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => openModal(null, 'products', { categoryId: category.id })}
                              className="p-3 text-orange-600 hover:bg-orange-50 rounded-xl transition-all font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                              title="Agregar Producto a esta Categoría"
                            >
                              <Plus size={16} /> <span className="hidden sm:inline">Añadir</span>
                            </button>
                            <button 
                              onClick={() => openModal(category, 'categories')}
                              className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                              title="Editar Categoría"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDelete(category.id)}
                              className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                              title="Eliminar Categoría"
                            >
                              <Trash2 size={18} />
                            </button>
                            <button 
                              onClick={() => setExpandedCategoryId(isExpanded ? null : category.id)}
                              className={`p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-all cursor-pointer ${isExpanded ? 'rotate-90' : ''}`}
                            >
                              <ChevronRight size={20} />
                            </button>
                          </div>
                        </div>
                        
                        {/* Contenido Desplegable */}
                        {isExpanded && (
                          <div className="border-t border-gray-50 bg-gray-50/20 p-5 space-y-4 animate-in fade-in duration-300">
                            {matchingProducts.length === 0 ? (
                              <p className="text-gray-400 text-center py-6 font-bold uppercase tracking-widest text-xs">
                                {searchTerm ? 'Ningún producto coincide con la búsqueda' : 'No hay productos en esta categoría'}
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {matchingProducts.map((product) => (
                                  <div 
                                    key={product.id} 
                                    className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow group/prod"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 font-black text-xs shrink-0 uppercase italic">
                                        {product.name.charAt(0)}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-bold text-gray-800 uppercase italic text-sm">{product.name}</span>
                                          {product.size && (
                                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-md text-gray-600 font-medium uppercase tracking-wider">
                                              {product.size}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-xs text-orange-600 font-black tracking-tighter">S/.{product.price.toFixed(2)}</span>
                                      </div>
                                    </div>
                                    
                                    <div className="flex gap-1 md:opacity-0 md:group-hover/prod:opacity-100 opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => openModal(product, 'products')}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                        title="Editar Producto"
                                      >
                                        <Edit2 size={16} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteProduct(product.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                        title="Eliminar Producto"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50/50 text-gray-400 uppercase text-[10px] font-black tracking-widest border-b border-gray-50">
                      <th className="px-8 py-4">Detalle Principal</th>
                      <th className="px-8 py-4">Información</th>
                      <th className="px-8 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-8 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">No se encontraron registros</td>
                      </tr>
                    ) : (
                      filteredData.map((item) => (
                        <tr key={item.id} className="group hover:bg-orange-50/30 transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xs shrink-0">
                                {item.number !== undefined ? item.number : (item.name || '').toString().charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-gray-800 uppercase italic leading-tight">{item.name || `Mesa ${item.number}`}</p>
                                  {item.size && <span className="text-xs bg-gray-200/60 px-2.5 py-0.5 rounded-full text-gray-900 font-black uppercase tracking-widest">{item.size}</span>}
                                </div>
                                {item.price && <p className="text-sm text-orange-600 font-black tracking-tighter">S/.{item.price.toFixed(2)}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                              {activeTab === 'products' && item.category?.name}
                              {activeTab === 'tables' && `Piso ${item.floor} - ${item.status}`}
                              {activeTab === 'users' && item.role}
                              {activeTab === 'categories' && `${item.products?.length || 0} Productos`}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
                              <button onClick={() => openModal(item)} className="p-3 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"><Edit2 size={18} /></button>
                              <button onClick={() => handleDelete(item.id)} className="p-3 text-red-600 hover:bg-red-100 rounded-xl transition-colors"><Trash2 size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
            {/* Modal Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 rounded-bl-[5rem] -mr-10 -mt-10" />
            
            <div className="flex justify-between items-center mb-8 relative">
              <div>
                <h3 className="text-2xl font-black text-gray-800 tracking-tighter uppercase italic">
                  {editingItem ? 'Editar' : 'Agregar'} {
                    editingType === 'products' ? 'Producto' :
                    editingType === 'categories' ? 'Categoría' :
                    editingType === 'tables' ? 'Mesa' :
                    editingType === 'users' ? 'Usuario' : editingType
                  }
                </h3>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Complete los campos necesarios</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 relative">
              {editingType === 'products' && (() => {
                const selectedCat = categories.find(c => c.id === (formData.categoryId || categories[0]?.id));
                const isBeverage = selectedCat && selectedCat.name.toLowerCase().includes('bebida');
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className={isBeverage ? "col-span-2 sm:col-span-1" : "col-span-2"}>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Nombre</label>
                        <input type="text" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                      </div>
                      {isBeverage && (
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Tamaño (opcional)</label>
                          <input type="text" placeholder="Ej: 1L, Personal" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold" value={formData.size || ''} onChange={e => setFormData({...formData, size: e.target.value})} />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Precio</label>
                        <input type="number" step="0.1" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} required />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Categoría</label>
                        <select className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} required>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                );
              })()}

              {editingType === 'categories' && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Nombre Categoría</label>
                  <input type="text" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
              )}

              {editingType === 'tables' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Número de Mesa</label>
                    <input type="number" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold" value={formData.number} onChange={e => setFormData({...formData, number: parseInt(e.target.value)})} required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Piso / Nivel</label>
                    <select className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold" value={formData.floor || 1} onChange={e => setFormData({...formData, floor: parseInt(e.target.value)})}>
                      <option value={1}>Piso 1</option>
                      <option value={2}>Piso 2</option>
                      <option value={3}>Piso 3</option>
                    </select>
                  </div>
                </div>
              )}

              {editingType === 'users' && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Nombre</label>
                    <input type="text" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">PIN (4 dígitos)</label>
                      <input type="text" maxLength={4} className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold tracking-widest" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Rol</label>
                      <select className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                        <option value="MOZO">MOZO</option>
                        <option value="COCINA">COCINA</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-100 hover:shadow-orange-200 transition-all active:scale-95">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedPastOrder && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
            {/* Modal Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 rounded-bl-[5rem] -mr-10 -mt-10" />
            
            <div className="flex justify-between items-center mb-6 relative border-b border-gray-50 pb-4">
              <div>
                <h3 className="text-2xl font-black text-gray-800 tracking-tighter uppercase italic">Mesa {selectedPastOrder.tableNumber}</h3>
                <p className="text-gray-800 text-xs font-black uppercase tracking-widest mt-0.5">Detalle de Consumos Pasados</p>
              </div>
              <button onClick={() => setSelectedPastOrder(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1 mb-6">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-xs font-black text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2">
                    <th className="pb-2">CANT</th>
                    <th className="pb-2">PRODUCTO</th>
                    <th className="pb-2 text-right">PRECIO</th>
                    <th className="pb-2 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {selectedPastOrder.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5">
                        <span className="bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded text-xs">{item.quantity}</span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 uppercase italic">{item.name}</span>
                          {item.size && <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-md text-gray-600 font-medium uppercase tracking-wider w-fit mt-0.5">{item.size}</span>}
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-medium text-gray-500">S/.{item.price.toFixed(2)}</td>
                      <td className="py-2.5 text-right font-black text-gray-800">S/.{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center py-4 border-t border-b border-gray-200 mb-6">
              <div className="text-left">
                <span className="text-xs text-gray-800 font-black uppercase tracking-widest block">Cobrado por</span>
                <span className="text-sm font-black text-gray-700 uppercase tracking-wider">{selectedPastOrder.waiterName}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-800 font-black uppercase tracking-widest block">Total Pagado</span>
                <span className="text-3xl font-black text-gray-900 tracking-tighter">S/.{selectedPastOrder.total.toFixed(2)}</span>
              </div>
            </div>

            <button 
              onClick={() => setSelectedPastOrder(null)} 
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-colors shadow-lg active:scale-95 cursor-pointer"
            >
              Cerrar Detalle
            </button>
          </div>
        </div>
      )}

      {/* Custom Admin Action Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full border border-gray-100 p-8 text-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
            {/* Ambient decoration */}
            <div className={`absolute -top-12 -right-12 w-24 h-24 rounded-full ${confirmAction.isDangerous ? 'bg-red-600/5' : 'bg-orange-600/5'}`} />
            
            <div className={`p-4.5 rounded-3xl inline-flex mb-5 border shadow-sm animate-bounce ${
              confirmAction.isDangerous 
              ? 'bg-red-50 text-red-600 border-red-100' 
              : 'bg-orange-50 text-orange-600 border-orange-100'
            }`}>
              {confirmAction.isDangerous ? <AlertCircle size={32} /> : <Clock size={32} />}
            </div>
            
            <h3 className="text-2xl font-black text-gray-800 tracking-tighter uppercase italic mb-2">
              {confirmAction.title}
            </h3>
            <p className="text-gray-500 text-sm font-semibold mb-6 leading-relaxed">
              {confirmAction.message}
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 bg-gray-100 text-gray-500 font-black py-4 rounded-2xl text-xs hover:bg-gray-200 transition-all uppercase tracking-widest cursor-pointer active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
                className={`flex-1 text-white font-black py-4 rounded-2xl text-xs shadow-lg transition-all active:scale-95 uppercase tracking-widest cursor-pointer ${
                  confirmAction.isDangerous 
                  ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-red-100 hover:shadow-red-200' 
                  : 'bg-gradient-to-r from-orange-600 to-orange-500 shadow-orange-100 hover:shadow-orange-200'
                }`}
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

const LiveMonitor = ({ setConfirmAction }) => {
  const { tables, activeOrders, checkoutTable } = useStore();
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(1);
  
  // Facturación fields
  const [invoiceType, setInvoiceType] = useState('BOLETA');
  const [docNumber, setDocNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [printSuccess, setPrintSuccess] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [monitorTab, setMonitorTab] = useState('tables'); // 'tables' | 'togo'
  const [docLoading, setDocLoading] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [savedToken, setSavedToken] = useState(localStorage.getItem('el_mana_apis_token') || '');

  // Auto-fetch DNI (RENIEC) or RUC (SUNAT) when length is 8 or 11
  useEffect(() => {
    const fetchDocData = async () => {
      const isRuc = invoiceType === 'FACTURA';
      const expectedLength = isRuc ? 11 : 8;
      
      if (docNumber && docNumber.length === expectedLength) {
        setDocLoading(true);
        try {
          const res = await api.get('/api/reniec-sunat/lookup', {
            params: {
              type: isRuc ? 'RUC' : 'DNI',
              number: docNumber,
              token: savedToken
            }
          });
          
          if (res.data) {
            if (isRuc && res.data.razonSocial) {
              setCustomerName(res.data.razonSocial);
            } else if (!isRuc && res.data.nombres) {
              const fullName = `${res.data.nombres} ${res.data.apellidoPaterno || ''} ${res.data.apellidoMaterno || ''}`.trim();
              setCustomerName(fullName);
            }
          }
        } catch (err) {
          console.error("Error al consultar DNI/RUC:", err);
        } finally {
          setDocLoading(false);
        }
      } else {
        setCustomerName('');
      }
    };
    
    fetchDocData();
  }, [docNumber, invoiceType]);

  const toGoOrdersCount = activeOrders.filter(o => o.toGo).length;
  const occupiedTablesCount = tables.filter(t => t.number !== 0).filter(table => 
    activeOrders.some(o => o.tableId === table.id && o.floor === selectedFloor)
  ).length;

  // Sync selected table's live state
  const liveTable = tables.find(t => t.id === selectedTable?.id);
  const isTableOccupiedOnSelectedFloor = selectedTable && activeOrders.some(o => o.tableId === selectedTable.id && o.floor === selectedTable.floor);
  const liveTableStatus = isTableOccupiedOnSelectedFloor ? 'OCUPADA' : 'LIBRE';
  const tableOrders = activeOrders.filter(o => o.tableId === selectedTable?.id && o.floor === selectedTable?.floor);
  const consolidatedItems = [];
  
  tableOrders.forEach(order => {
    (order.items || []).forEach(item => {
      const existing = consolidatedItems.find(i => i.productId === item.productId && i.notes === item.notes);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        consolidatedItems.push({ ...item });
      }
    });
  });

  const accountTotal = tableOrders.reduce((acc, o) => acc + o.total, 0);
  const oldestOrder = tableOrders.reduce((oldest, current) => {
    if (!oldest) return current;
    return new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest;
  }, null);

  const handlePrint = async () => {
    if (!selectedTable) return;
    setPrintLoading(true);
    setPrintSuccess(false);
    try {
      await api.post(`/api/tables/${selectedTable.id}/print-bill`, {
        type: invoiceType,
        docNumber,
        customerName,
        floor: selectedTable.floor
      });
      setPrintSuccess(true);
      setTimeout(() => setPrintSuccess(false), 4000);
    } catch (err) {
      alert("Error al enviar a la impresora POS");
    } finally {
      setPrintLoading(false);
    }
  };

  const handleCheckout = (onDone) => {
    if (!selectedTable) return;
    setConfirmAction({
      title: selectedTable.number === 0 ? '¿Cobrar y Finalizar Pedido?' : '¿Cobrar y Liberar Mesa?',
      message: selectedTable.number === 0
        ? `¿Estás seguro de registrar el cobro y finalizar este Pedido para Llevar? Se archivará en la caja.`
        : `¿Estás seguro de registrar el cobro y liberar la Mesa ${selectedTable.number} en el Piso ${selectedTable.floor}? Se archivarán todos sus consumos en caja.`,
      isDangerous: false,
      onConfirm: async () => {
        await checkoutTable(selectedTable.id, selectedTable.floor);
        setSelectedTable(null);
        setDocNumber('');
        setCustomerName('');
        if (typeof onDone === 'function') onDone();
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden h-[calc(100vh-140px)] animate-in fade-in duration-500">
      
      {/* Panel Principal de Monitoreo (Izquierda) */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar border-r border-gray-100 flex flex-col gap-6 bg-gray-50/50">
        
        {/* Selector de Vista Universal (Local vs Llevar) - Visible en todas las pantallas */}
        <div className="flex bg-gray-100/90 p-1.5 rounded-[2rem] w-full max-w-xl mx-auto shrink-0 shadow-sm border border-gray-200/40 select-none">
          <button
            type="button"
            onClick={() => setMonitorTab('tables')}
            className={`flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              monitorTab === 'tables'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-100'
              : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>🍽️ Consumo en Local ({occupiedTablesCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setMonitorTab('togo')}
            className={`flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              monitorTab === 'togo'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-100'
              : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>📦 Pedidos para Llevar ({toGoOrdersCount})</span>
          </button>
        </div>
        
        {/* Tarjeta 1: Mesas del Salón */}
        <div className={`flex-1 bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-200/60 shadow-sm flex flex-col min-w-0 ${
          monitorTab === 'tables' ? 'flex' : 'hidden'
        }`}>
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-black text-gray-800 tracking-tight uppercase italic flex items-center gap-2">
                🍽️ Monitoreo de Mesas
              </h3>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Estado de mesas en tiempo real</p>
            </div>
            
            {/* Selector de Pisos */}
            <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
              {[1, 2, 3].map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSelectedFloor(f)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    selectedFloor === f 
                    ? 'bg-white text-orange-600 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Piso {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xl:gap-6">
            {([...tables].filter(t => t.number !== 0).sort((a, b) => a.number - b.number)).map(table => {
              const isOcupada = activeOrders.some(o => o.tableId === table.id && o.floor === selectedFloor);
              const orders = activeOrders.filter(o => o.tableId === table.id && o.floor === selectedFloor);
              const total = orders.reduce((acc, o) => acc + o.total, 0);
              const oldestOrder = orders.reduce((oldest, current) => {
                if (!oldest) return current;
                return new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest;
              }, null);
              
              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => {
                    setSelectedTable({ ...table, floor: selectedFloor });
                    setPrintSuccess(false);
                    setIsMobileOpen(true);
                  }}
                  className={`relative p-5 rounded-[2rem] text-left border shadow-sm transition-all active:scale-95 flex flex-col justify-between h-40 cursor-pointer ${
                    selectedTable?.id === table.id && selectedTable?.floor === selectedFloor
                    ? 'border-orange-500 ring-2 ring-orange-500 bg-orange-50/20'
                    : isOcupada
                      ? 'bg-orange-50/50 border-orange-100'
                      : 'bg-white border-gray-100 hover:border-orange-200 hover:shadow-md'
                  }`}
                >
                  <div>
                    <h4 className="text-xl font-black text-gray-800 italic leading-none">MESA {table.number}</h4>
                    {isOcupada && oldestOrder ? (
                      <div className="flex flex-col gap-1 mt-1.5 select-none">
                        <span className="text-[9px] text-black font-black uppercase tracking-wider">
                          Llegó: {new Date(oldestOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div>
                          <TableTimer 
                            createdAt={oldestOrder.createdAt} 
                            isFinished={orders.length > 0 && orders.every(o => o.status === 'LISTO')}
                            updatedAt={orders.reduce((latest, current) => {
                              if (!latest) return current.updatedAt || current.createdAt;
                              const curDate = new Date(current.updatedAt || current.createdAt);
                              const latDate = new Date(latest);
                              return curDate > latDate ? (current.updatedAt || current.createdAt) : latest;
                            }, null)}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full inline-block mt-2 tracking-widest uppercase ${
                        isOcupada ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {isOcupada ? 'OCUPADA' : 'LIBRE'}
                      </span>
                    )}
                  </div>
                  {isOcupada && (
                    <p className="text-base font-black text-orange-600 tracking-tighter">S/.{total.toFixed(2)}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tarjeta 2: Pedidos para Llevar */}
        <div className={`flex-1 bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-200/60 shadow-sm flex flex-col min-w-0 ${
          monitorTab === 'togo' ? 'flex' : 'hidden'
        }`}>
          <div className="mb-6">
            <h3 className="text-xl font-black text-gray-800 uppercase italic tracking-normal flex items-center gap-2">
              <span>📦</span> Pedidos para Llevar
            </h3>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
              Facturación de despachos rápidos
            </p>
          </div>

          <div className="flex-1 mt-2">
            {activeOrders.filter(o => o.toGo).length === 0 ? (
              <div className="bg-gray-50 border border-gray-100 p-8 rounded-[2rem] text-center text-gray-400 font-bold italic text-xs">
                No hay pedidos para llevar activos
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 xl:gap-6">
                {activeOrders.filter(o => o.toGo).map(order => {
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => {
                        setSelectedTable({ id: order.tableId, number: 0, floor: 1 });
                        setPrintSuccess(false);
                        setIsMobileOpen(true);
                      }}
                      className={`relative p-5 rounded-[2rem] text-left border shadow-sm transition-all active:scale-95 flex flex-col justify-between h-40 cursor-pointer ${
                        selectedTable?.id === order.tableId
                        ? 'border-orange-500 ring-2 ring-orange-500 bg-orange-50/20'
                        : 'bg-white border-gray-100 hover:border-orange-200'
                      }`}
                    >
                      <div className="w-full min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-base font-black text-orange-600 uppercase italic truncate tracking-tight">
                            👤 {order.waiterName || 'Para Llevar'}
                          </h4>
                          <span className="text-[8px] bg-orange-100 text-orange-700 font-black px-2 py-0.5 rounded-full uppercase shrink-0">
                            {order.items?.length || 0} ITEMS
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 mt-2">
                          <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider">
                            Creado: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div>
                            <TableTimer 
                              createdAt={order.createdAt} 
                              isFinished={order.status === 'LISTO' || (order.items && order.items.every(i => i.status === 'LISTO'))}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-end w-full mt-2">
                        <span className={`text-[8px] border px-2 py-0.5 rounded-full font-black uppercase ${
                          order.status === 'LISTO' 
                          ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                          : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 animate-pulse'
                        }`}>
                          {order.status}
                        </span>
                        <p className="text-lg font-black text-orange-600 tracking-tighter">S/.{order.total.toFixed(2)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Cuenta y Facturación (Derecha - Solo Desktop XL) */}
      <div className="hidden xl:flex xl:w-[420px] bg-gray-50/30 flex-col overflow-hidden h-full border-l border-gray-100 shrink-0">
        {selectedTable && liveTableStatus === 'OCUPADA' ? (
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-300 bg-white">
            {/* Detalle Consumos */}
            <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-black text-gray-800 tracking-tighter uppercase italic">
                  {selectedTable.number === 0 ? '📦 PEDIDO PARA LLEVAR' : `Mesa ${selectedTable.number} - Piso ${selectedTable.floor}`}
                </h3>
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest leading-none">
                    {selectedTable.number === 0 ? 'Detalles de comanda rápida' : 'Consumos activos de mesa'}
                  </p>
                  {oldestOrder && (
                    <div className="flex items-center gap-1.5 z-10">
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
                <span className="text-xs text-gray-800 font-black uppercase tracking-widest block mb-1">Total</span>
                <p className="text-3xl font-black text-gray-900 tracking-tighter">S/.{accountTotal.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-white border-b border-gray-100">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-xs font-black text-gray-800 uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-2">CANT</th>
                    <th className="pb-2">PRODUCTO</th>
                    <th className="pb-2 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {consolidatedItems.map((item, idx) => (
                    <tr key={idx} className="group">
                      <td className="py-2.5">
                        <span className="bg-orange-50 text-orange-600 font-black px-2 py-0.5 rounded text-xs">{item.quantity}</span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 uppercase leading-tight">{item.name}</span>
                          {item.size && <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-md text-gray-600 font-medium uppercase tracking-wider w-fit mt-0.5">{item.size}</span>}
                          <span className={`text-[8px] px-2 py-0.5 rounded-full font-black mt-1 inline-block w-fit uppercase ${
                            item.status === 'LISTO' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600 animate-pulse'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-black text-gray-800">S/.{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Facturación y POS */}
            <div className="p-6 bg-white space-y-4 shadow-2xl border-t border-gray-100 shrink-0">
              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest italic">Comprobante y Pago</h4>
                <button
                  type="button"
                  onClick={() => setIsTokenModalOpen(true)}
                  className="p-1 hover:bg-orange-50 text-gray-400 hover:text-orange-600 rounded-md transition-colors cursor-pointer"
                  title="Configurar Token RENIEC / SUNAT"
                >
                  <Tag size={14} strokeWidth={2.5} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-gray-800 uppercase tracking-widest mb-1.5 px-1">Comprobante</label>
                  <select 
                    value={invoiceType}
                    onChange={(e) => {
                      setInvoiceType(e.target.value);
                      setDocNumber('');
                    }}
                    className="w-full p-3 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  >
                    <option value="BOLETA">BOLETA</option>
                    <option value="FACTURA">FACTURA</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5 px-1">
                    <label className="block text-xs font-black text-gray-800 uppercase tracking-widest leading-none">
                      {invoiceType === 'FACTURA' ? 'R.U.C. (11 díg)' : 'D.N.I. (8 díg)'}
                    </label>
                    {docLoading && (
                      <span className="text-[8px] text-orange-600 font-extrabold uppercase tracking-widest animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-ping inline-block" /> Buscando...
                      </span>
                    )}
                  </div>
                  <input 
                    type="text" 
                    maxLength={invoiceType === 'FACTURA' ? 11 : 8}
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder={invoiceType === 'FACTURA' ? '10452389512' : '48259631'}
                    className="w-full p-3 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-800 uppercase tracking-widest mb-1.5 px-1">
                  {invoiceType === 'FACTURA' ? 'Razón Social' : 'Nombre del Cliente'}
                </label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={invoiceType === 'FACTURA' ? 'CONSTRUCTORA BURGOS S.A.C.' : 'Juan Perez'}
                  className="w-full p-3 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all uppercase"
                />
              </div>

              {printSuccess && (
                <div className="bg-green-50 text-green-600 text-xs p-3 rounded-2xl font-bold flex items-center gap-2 border border-green-200/50 animate-in fade-in duration-300">
                  <CheckCircle size={16} /> ¡Comprobante enviado a la ticketera POS física con éxito!
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  disabled={printLoading}
                  className="flex-1 bg-gray-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-orange-600 transition-all active:scale-95 text-[10px] tracking-widest uppercase cursor-pointer disabled:opacity-50"
                >
                  <Printer size={16} /> {printLoading ? 'Imprimiendo...' : 'Imprimir POS'}
                </button>
                <button
                  onClick={handleCheckout}
                  className="flex-1 bg-orange-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-orange-500 transition-all active:scale-95 text-[10px] tracking-widest uppercase cursor-pointer"
                >
                  <CheckCircle size={16} /> Cobrar y Cerrar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center opacity-60 gap-4 h-full">
            <Activity size={48} className="text-gray-300 animate-pulse" />
            <div>
              <p className="font-black text-sm uppercase tracking-widest">Mesa sin consumos activos</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[280px] mx-auto leading-relaxed">Selecciona una mesa ocupada a la izquierda para ver su cuenta en tiempo real, emitir comprobantes o liberar la mesa.</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalles para Mobile/Tablet/Laptop < XL */}
      {isMobileOpen && selectedTable && liveTableStatus === 'OCUPADA' && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 xl:hidden animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 relative max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Header del Modal */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-xl font-black text-gray-800 tracking-tighter uppercase italic">{selectedTable.number === 0 ? '📦 PEDIDO PARA LLEVAR' : `Mesa ${selectedTable.number} - Piso ${selectedTable.floor}`}</h3>
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest leading-none">{selectedTable.number === 0 ? 'Detalles de comanda rápida' : 'Consumos activos de mesa'}</p>
                  {oldestOrder && (
                    <div className="flex items-center gap-1.5 z-10">
                      <span className="text-[10px] text-black font-black uppercase tracking-wider">
                        Llegó: {new Date(oldestOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <TableTimer createdAt={oldestOrder.createdAt} />
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setIsMobileOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo del Modal (Tabla de items) */}
            <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-xs font-black text-gray-800 uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-2">CANT</th>
                    <th className="pb-2">PRODUCTO</th>
                    <th className="pb-2 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {consolidatedItems.map((item, idx) => (
                    <tr key={idx} className="group">
                      <td className="py-2.5">
                        <span className="bg-orange-50 text-orange-600 font-black px-2 py-0.5 rounded text-xs">{item.quantity}</span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 uppercase leading-tight">{item.name}</span>
                          {item.size && <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-md text-gray-600 font-medium uppercase tracking-wider w-fit mt-0.5">{item.size}</span>}
                          <span className={`text-[8px] px-2 py-0.5 rounded-full font-black mt-1 inline-block w-fit uppercase ${
                            item.status === 'LISTO' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600 animate-pulse'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-black text-gray-800">S/.{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center py-4 border-t border-b border-gray-100 my-4 shrink-0">
                <span className="text-gray-500 font-bold uppercase tracking-widest text-xs">Total a Pagar</span>
                <span className="text-3xl font-black text-gray-900 tracking-tighter">S/.{accountTotal.toFixed(2)}</span>
              </div>

              {/* Facturación y POS en Modal */}
              <div className="space-y-4 shrink-0">
                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest italic">Comprobante y Pago</h4>
                  <button
                    type="button"
                    onClick={() => setIsTokenModalOpen(true)}
                    className="p-1 hover:bg-orange-50 text-gray-400 hover:text-orange-600 rounded-md transition-colors cursor-pointer"
                    title="Configurar Token RENIEC / SUNAT"
                  >
                    <Tag size={14} strokeWidth={2.5} />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-gray-800 uppercase tracking-widest mb-1.5 px-1">Comprobante</label>
                    <select 
                      value={invoiceType}
                      onChange={(e) => {
                        setInvoiceType(e.target.value);
                        setDocNumber('');
                      }}
                      className="w-full p-3 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    >
                      <option value="BOLETA">BOLETA</option>
                      <option value="FACTURA">FACTURA</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1.5 px-1">
                      <label className="block text-xs font-black text-gray-800 uppercase tracking-widest leading-none">
                        {invoiceType === 'FACTURA' ? 'R.U.C. (11 díg)' : 'D.N.I. (8 díg)'}
                      </label>
                      {docLoading && (
                        <span className="text-[8px] text-orange-600 font-extrabold uppercase tracking-widest animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-ping inline-block" /> Buscando...
                        </span>
                      )}
                    </div>
                    <input 
                      type="text" 
                      maxLength={invoiceType === 'FACTURA' ? 11 : 8}
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder={invoiceType === 'FACTURA' ? '10452389512' : '48259631'}
                      className="w-full p-3 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-800 uppercase tracking-widest mb-1.5 px-1">
                    {invoiceType === 'FACTURA' ? 'Razón Social' : 'Nombre del Cliente'}
                  </label>
                  <input 
                    type="text" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={invoiceType === 'FACTURA' ? 'CONSTRUCTORA BURGOS S.A.C.' : 'Juan Perez'}
                    className="w-full p-3 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all uppercase"
                  />
                </div>

                {printSuccess && (
                  <div className="bg-green-50 text-green-600 text-xs p-3 rounded-2xl font-bold flex items-center gap-2 border border-green-200/50 animate-in fade-in duration-300">
                    <CheckCircle size={16} /> ¡Comprobante enviado a la ticketera POS física!
                  </div>
                )}
              </div>
            </div>

            {/* Botones de acción en Modal */}
            <div className="pt-4 border-t border-gray-100 flex gap-3 shrink-0">
              <button
                onClick={handlePrint}
                disabled={printLoading}
                className="flex-1 bg-gray-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-orange-600 transition-all active:scale-95 text-[10px] tracking-widest uppercase cursor-pointer disabled:opacity-50"
              >
                <Printer size={16} /> {printLoading ? 'Imprimiendo...' : 'Imprimir POS'}
              </button>
              <button
                onClick={() => {
                  handleCheckout(() => setIsMobileOpen(false));
                }}
                className="flex-1 bg-orange-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-orange-500 transition-all active:scale-95 text-[10px] tracking-widest uppercase cursor-pointer"
              >
                <CheckCircle size={16} /> Cobrar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración de Token RENIEC / SUNAT */}
      {isTokenModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
            {/* Ambient decoration */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-600/5 rounded-bl-[4rem]" />
            
            <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
              <div>
                <h3 className="text-xl font-black text-gray-800 tracking-tighter uppercase italic flex items-center gap-2">
                  🔑 Token RENIEC & SUNAT
                </h3>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-0.5">Activar consultas reales en caja</p>
              </div>
              <button 
                onClick={() => setIsTokenModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Para activar la consulta automática y 100% real de nombres de clientes y razones sociales en tiempo real, obtén tu token gratuito en <a href="https://apis.net.pe" target="_blank" rel="noopener noreferrer" className="text-orange-600 font-black hover:underline">apis.net.pe</a> y pégalo aquí:
              </p>

              <div>
                <label className="block text-xs font-black text-gray-800 uppercase tracking-widest mb-1.5 px-1">Token Personal (apis.net.pe)</label>
                <input
                  type="text"
                  value={savedToken}
                  onChange={(e) => setSavedToken(e.target.value)}
                  placeholder="apis-token-11440.Xk7..."
                  className="w-full p-3.5 bg-gray-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setIsTokenModalOpen(false)}
                className="flex-1 bg-gray-100 text-gray-500 font-black py-4 rounded-2xl text-xs hover:bg-gray-200 transition-all uppercase tracking-widest cursor-pointer active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('el_mana_apis_token', savedToken);
                  setIsTokenModalOpen(false);
                  alert("¡Token guardado exitosamente! Ahora las consultas se realizarán con tus credenciales.");
                }}
                className="flex-1 bg-orange-600 text-white font-black py-4 rounded-2xl text-xs shadow-lg hover:bg-orange-500 transition-all uppercase tracking-widest cursor-pointer active:scale-95"
              >
                Guardar y Activar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPage;
