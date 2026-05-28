import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import api from './services/api';
import { Header } from './components/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import WaiterPage from './pages/WaiterPage';
import KitchenPage from './pages/KitchenPage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import { ChevronLeft } from 'lucide-react';
import { GlobalNotifications } from './components/GlobalNotifications';


function App() {
  const { 
    user, 
    customWaiterName,
    restoreSession, 
    login, 
    logout, 
    tables,
    setTables, 
    setMenu, 
    activeOrders,
    setActiveOrders, 
    selectedTable, 
    setSelectedTable, 
    viewMode, 
    setViewMode 
  } = useStore();

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (user) {
      api.get('/api/tables').then(res => setTables(res.data));
      api.get('/api/menu').then(res => setMenu(res.data));
      api.get('/api/orders/active').then(res => setActiveOrders(res.data));
    }
  }, [user]);

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  const isTableOccupiedOnSelectedFloor = selectedTable && activeOrders.some(o => o.tableId === selectedTable.id && o.floor === selectedTable.floor);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={{ ...user, name: (user.role === 'MOZO' && customWaiterName) ? `${customWaiterName.toUpperCase()}` : user.name }}
        onLogout={logout}
        title={
          selectedTable ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedTable(null)} 
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 cursor-pointer"
              >
                <ChevronLeft size={16} className="text-gray-600" />
              </button>
              <div className="flex flex-col">
                <h2 className="text-sm font-black text-gray-700 uppercase tracking-widest leading-tight">MESA {selectedTable.number} - PISO {selectedTable.floor}</h2>
                <p className="text-[10px] text-orange-600 font-black uppercase tracking-wider">
                  {isTableOccupiedOnSelectedFloor ? 'Mesa Ocupada' : 'Nuevo Pedido'}
                </p>
              </div>
            </div>
          ) : (
            user.role === 'COCINA' ? 'Área de Producción' : user.role === 'ADMIN' ? 'Panel Administrativo' : 'Punto de Venta'
          )
        }
        subtitle={selectedTable ? null : `${(user.role === 'MOZO' && customWaiterName) ? customWaiterName : user.name} - ${new Date().toLocaleDateString('es-PE')}`}
        action={
          selectedTable && isTableOccupiedOnSelectedFloor && (
            <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
              <button 
                onClick={() => setViewMode('ACCOUNT')}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${viewMode === 'ACCOUNT' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                CUENTA
              </button>
              <button 
                onClick={() => setViewMode('MENU')}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${viewMode === 'MENU' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                CARTA
              </button>
            </div>
          )
        }
      />
      <div className="p-4 sm:p-8 transition-all duration-500">
        {user.role === 'COCINA' && <KitchenPage />}
        {user.role === 'MOZO' && (
          <ErrorBoundary>
            <WaiterPage />
          </ErrorBoundary>
        )}
        {user.role === 'ADMIN' && <AdminPage />}
      </div>
      <GlobalNotifications />
    </div>
  );
}

export default App;
