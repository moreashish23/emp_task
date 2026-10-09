import React from 'react';
import { Link } from 'react-router-dom';
import { FiEye, FiEdit2, FiTrash2, FiUserX, FiMail, FiPhone } from 'react-icons/fi';
import { formatCurrency } from '../../utils/formatters';

const EmployeeTable = ({ employees = [], onDeleteClick }) => {
  if (employees.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiUserX className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">No Employees Found</h3>
        <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
          No records match your search criteria or no employee data is currently recorded in the system.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider">
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Employee</th>
              <th className="px-6 py-4">Department</th>
              <th className="px-6 py-4">Salary</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-sm">
            {employees.map((emp) => (
              <tr 
                key={emp.id} 
                className="hover:bg-slate-50/80 transition-colors duration-150"
              >

                {/* Employee Name & Email */}
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 text-base">
                      {emp.name}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <FiMail className="w-3.5 h-3.5 text-slate-400" />
                      {emp.email}
                    </span>
                  </div>
                </td>

                {/* Department Tag */}
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                    {emp.department || 'Unassigned'}
                  </span>
                </td>

                {/* Formatted Salary */}
                <td className="px-6 py-4 font-medium text-slate-800">
                  {formatCurrency(emp.salary)}
                </td>

                {/* Phone */}
                <td className="px-6 py-4 text-slate-600">
                  {emp.phone ? (
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <FiPhone className="w-3.5 h-3.5 text-slate-400" />
                      {emp.phone}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">N/A</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {/* View Action */}
                    <Link
                      to={`/employees/${emp.id}`}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <FiEye className="w-4 h-4" />
                    </Link>

                    {/* Edit Action */}
                    <Link
                      to={`/employees/${emp.id}/edit`}
                      className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Edit Employee"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </Link>

                    {/* Delete Action */}
                    <button
                      onClick={() => onDeleteClick(emp)}
                      className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Employee"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeTable;
