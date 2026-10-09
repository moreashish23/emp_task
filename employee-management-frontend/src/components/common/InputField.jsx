import React from 'react';

const InputField = ({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  icon: Icon = null,
  disabled = false,
  helperText,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex flex-col space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id || name} className="text-sm font-semibold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative rounded-lg shadow-xs">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
        
        <input
          id={id || name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3.5 py-2 text-sm text-slate-900 bg-white border rounded-lg transition-all duration-150 outline-none
            ${Icon ? 'pl-10' : 'pl-3.5'}
            ${error 
              ? 'border-red-500 focus:ring-2 focus:ring-red-200 focus:border-red-500' 
              : 'border-slate-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-600'
            }
            ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200' : ''}
          `}
          {...props}
        />
      </div>

      {error ? (
        <p className="text-xs font-medium text-red-600 animate-fade-in">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};

export default InputField;
