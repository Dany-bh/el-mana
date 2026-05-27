import React from 'react';

export const Input = ({ 
  label, 
  error, 
  className = '',
  containerClassName = '',
  ...props 
}) => {
  return (
    <div className={`flex flex-col gap-2 ${containerClassName}`}>
      {label && (
        <label className="text-sm font-bold text-gray-700 uppercase tracking-widest">
          {label}
        </label>
      )}
      <input 
        className={`px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition-colors bg-white ${className} ${error ? 'border-red-500' : ''}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-600 font-bold">{error}</span>
      )}
    </div>
  );
};

export const Select = ({ 
  label, 
  options = [],
  error,
  className = '',
  containerClassName = '',
  ...props 
}) => {
  return (
    <div className={`flex flex-col gap-2 ${containerClassName}`}>
      {label && (
        <label className="text-sm font-bold text-gray-700 uppercase tracking-widest">
          {label}
        </label>
      )}
      <select 
        className={`px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition-colors bg-white ${className} ${error ? 'border-red-500' : ''}`}
        {...props}
      >
        <option value="">Selecciona una opción</option>
        {options.map((opt) => (
          <option key={opt.id || opt.value} value={opt.id || opt.value}>
            {opt.label || opt.name}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-xs text-red-600 font-bold">{error}</span>
      )}
    </div>
  );
};

export const TextArea = ({ 
  label, 
  error,
  className = '',
  containerClassName = '',
  ...props 
}) => {
  return (
    <div className={`flex flex-col gap-2 ${containerClassName}`}>
      {label && (
        <label className="text-sm font-bold text-gray-700 uppercase tracking-widest">
          {label}
        </label>
      )}
      <textarea 
        className={`px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition-colors bg-white resize-none ${className} ${error ? 'border-red-500' : ''}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-600 font-bold">{error}</span>
      )}
    </div>
  );
};

export default Input;
