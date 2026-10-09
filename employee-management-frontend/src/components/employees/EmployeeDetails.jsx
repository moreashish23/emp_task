import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FiUser, 
  FiMail, 
  FiBriefcase, 
  FiDollarSign, 
  FiPhone, 
  FiCalendar, 
  FiEdit2, 
  FiArrowLeft,
  FiHash
} from 'react-icons/fi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Button from '../common/Button';

const EmployeeDetails = ({ employee }) => {
  if (!employee) return null;

  const detailItems = [
    {
      label: 'Employee ID',
      value: `#${employee.id}`,
      icon: FiHash,
    },
    {
      label: 'Full Name',
      value: employee.name,
      icon: FiUser,
    },
    {
      label: 'Email Address',
      value: employee.email,
      icon: FiMail,
    },
    {
      label: 'Department',
      value: employee.department || 'Not Assigned',
      icon: FiBriefcase,
      badge: true,
    },
    {
      label: 'Annual Salary',
      value: formatCurrency(employee.salary),
      icon: FiDollarSign,
      highlight: true,
    },
    {
      label: 'Phone Contact',
      value: employee.phone || 'Not Provided',
      icon: FiPhone,
    },
    {
      label: 'Record Created',
      value: formatDate(employee.createdAt),
      icon: FiCalendar,
    },
    {
      label: 'Last Updated',
      value: formatDate(employee.updatedAt),
      icon: FiCalendar,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center font-bold text-2xl text-white shadow-lg border-2 border-white/20">
            {employee.name ? employee.name.charAt(0).toUpperCase() : 'E'}
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{employee.name}</h2>
            <p className="text-slate-300 text-sm flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                {employee.department || 'Employee'}
              </span>
              <span>•</span>
              <span>ID: #{employee.id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Link to="/employees">
            <Button variant="outline" className="bg-white/10 text-white hover:bg-white/20 border-white/20">
              <FiArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
          <Link to={`/employees/${employee.id}/edit`}>
            <Button variant="primary" icon={FiEdit2}>
              Edit Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="p-6 sm:p-8">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-6">
          Detailed Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {detailItems.map((item, index) => (
            <div 
              key={index}
              className="flex items-start space-x-3.5 p-4 rounded-lg bg-slate-50/70 border border-slate-100"
            >
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-xs">
                <item.icon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  {item.label}
                </span>
                <p className={`text-base font-semibold mt-0.5 ${item.highlight ? 'text-blue-600 font-bold' : 'text-slate-800'}`}>
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetails;
