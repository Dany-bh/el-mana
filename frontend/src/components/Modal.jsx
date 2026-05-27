import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  size = 'md',
  className = '',
  closeButton = true,
  ...props 
}) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} {...props}>
      <div 
        className={`bg-white rounded-3xl shadow-2xl w-full ${sizes[size]} animate-in zoom-in-95 duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          {title && (
            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter italic">
              {title}
            </h2>
          )}
          {closeButton && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-auto"
            >
              <X className="text-gray-600" size={24} />
            </button>
          )}
        </div>
        <div className={`p-6 ${className}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
