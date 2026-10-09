import React from 'react';
import { Link } from 'react-router-dom';
import { FiAlertOctagon, FiHome } from 'react-icons/fi';
import Button from '../components/common/Button';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl p-8 text-center shadow-2xl border border-slate-100">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
          <FiAlertOctagon className="w-8 h-8" />
        </div>
        
        <h1 className="text-4xl font-extrabold text-slate-900">404</h1>
        <h2 className="text-xl font-bold text-slate-800 mt-1">Page Not Found</h2>
        
        <p className="text-slate-500 text-sm mt-3 mb-6 leading-relaxed">
          The page or employee resource you are looking for doesn't exist, has been removed, or is temporarily unavailable.
        </p>

        <Link to="/dashboard">
          <Button variant="primary" className="w-full py-2.5" icon={FiHome}>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
