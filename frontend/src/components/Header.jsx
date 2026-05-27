import React from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';

export const Header = ({ 
  user,
  onLogout,
  title,
  subtitle,
  action,
  ...props 
}) => {
  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm p-4 sticky top-0 z-40 transition-colors" {...props}>
      <div className="flex justify-between items-center">
        {/* Logo & Title */}
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-2.5 rounded-2xl shadow-md">
            <h1 className="text-2xl font-black text-white italic tracking-tighter">M<span className="hidden sm:inline">ANÁ</span></h1>
          </div>
          <div className="h-8 w-[2px] bg-gray-200 hidden sm:block" />
          {title && (
            <div className="flex flex-col">
              {typeof title === 'string' ? (
                <h2 className="text-sm font-black text-gray-700 uppercase tracking-widest leading-tight">{title}</h2>
              ) : (
                title
              )}
              {subtitle && <p className="text-xs text-gray-500 font-bold">{subtitle}</p>}
            </div>
          )}
        </div>

        {/* Center Action */}
        {action && (
          <div className="hidden md:block">
            {action}
          </div>
        )}

        {/* User Section */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-gray-200 bg-gray-50/50 hover:border-orange-200 transition-colors">
            <div className="bg-orange-100 p-1.5 rounded-full">
              <UserIcon size={16} className="text-orange-600" />
            </div>
            <span className="text-sm font-bold text-gray-700 hidden sm:inline">{user?.name}</span>
            <span className="text-xs font-black text-gray-500 uppercase tracking-widest hidden md:inline">
              {user?.role}
            </span>
          </div>
          
          <button 
            onClick={onLogout}
            className="p-2.5 hover:bg-red-100 rounded-full transition-colors text-red-600 hover:text-red-700"
            title="Cerrar sesión"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Action */}
      {action && (
        <div className="md:hidden mt-3">
          {action}
        </div>
      )}
    </nav>
  );
};

export default Header;
