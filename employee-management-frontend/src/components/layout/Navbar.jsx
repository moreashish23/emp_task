import React from 'react';
import { FiMenu, FiLogOut, FiUser, FiShield } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden focus:outline-none"
            aria-label="Toggle Navigation Sidebar"
          >
            <FiMenu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
              Enterprise Dashboard
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-5">
          {user && (
            <div className="flex items-center space-x-3 border-r border-slate-200 pr-4 hidden sm:flex">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-800 leading-none">
                  {user.email}
                </span>
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-1">
                  <FiShield className="w-3 h-3 text-blue-500" />
                  {user.role || 'ROLE_USER'}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className="flex items-center space-x-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors duration-150 cursor-pointer"
            title="Log out of application"
          >
            <FiLogOut className="w-4 h-4 text-red-500" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
