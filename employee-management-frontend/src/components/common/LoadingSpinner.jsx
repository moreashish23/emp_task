import React from 'react';
import { FiLoader } from 'react-icons/fi';

const LoadingSpinner = ({ size = 'medium', text = 'Loading...', fullScreen = false }) => {
  const sizeClasses = {
    small: 'w-5 h-5 text-sm',
    medium: 'w-8 h-8 text-base',
    large: 'w-12 h-12 text-lg',
  };

  const content = (
    <div className="flex flex-col items-center justify-center p-6 space-y-3">
      <FiLoader className={`animate-spin text-blue-600 ${sizeClasses[size] || sizeClasses.medium}`} />
      {text && <p className="text-sm font-medium text-slate-600">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-xs">
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 min-w-[200px]">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
