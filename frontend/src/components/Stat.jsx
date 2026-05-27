import React from 'react';

export const Stat = ({ 
  icon: Icon,
  label,
  value,
  trend,
  trendUp = true,
  className = '',
  ...props 
}) => {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow ${className}`} {...props}>
      <div className="flex items-start justify-between mb-3">
        {Icon && (
          <div className="bg-orange-100 p-3 rounded-xl">
            <Icon size={24} className="text-orange-600" />
          </div>
        )}
        {trend && (
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-gray-800">{value}</p>
    </div>
  );
};

export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`${sizes[size]} border-4 border-gray-200 border-t-orange-600 rounded-full animate-spin ${className}`} />
  );
};

export const EmptyState = ({ 
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="bg-gray-100 p-6 rounded-2xl mb-4">
        {Icon && <Icon size={48} className="text-gray-400" />}
      </div>
      <h3 className="text-xl font-black text-gray-800 mb-2 uppercase tracking-tighter italic">{title}</h3>
      <p className="text-gray-500 text-sm text-center mb-6 max-w-xs">{description}</p>
      {action && action}
    </div>
  );
};

export default Stat;
