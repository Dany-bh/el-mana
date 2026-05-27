import React from 'react';

export const Card = ({ 
  children, 
  className = '', 
  hover = false,
  interactive = false,
  ...props 
}) => {
  const hoverClass = hover ? 'hover:shadow-xl hover:shadow-orange-50 hover:border-orange-200 transition-all' : '';
  const interactiveClass = interactive ? 'cursor-pointer active:scale-95 transition-transform' : '';

  return (
    <div 
      className={`bg-white rounded-3xl border border-gray-100 shadow-sm ${hoverClass} ${interactiveClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`border-b border-gray-100 p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardBody = ({ children, className = '', ...props }) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`border-t border-gray-100 p-6 flex gap-3 justify-end ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
