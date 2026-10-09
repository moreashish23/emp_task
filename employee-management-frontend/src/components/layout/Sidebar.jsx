import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FiGrid, 
  FiUsers, 
  FiUserPlus, 
  FiX, 
  FiBriefcase
} from 'react-icons/fi';

const Sidebar = ({ isOpen, onClose }) => {
  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: FiGrid,
    },
    {
      label: 'Employees List',
      path: '/employees',
      icon: FiUsers,
    },
    {
      label: 'Add Employee',
      path: '/employees/add',
      icon: FiUserPlus,
    },
  ];

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand logo header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <FiBriefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-wide text-white">EMS Portal</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Employee Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        
        <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Main Menu
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="text-xs text-slate-400 text-center">
            EMS Web Client v1.0.0
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
