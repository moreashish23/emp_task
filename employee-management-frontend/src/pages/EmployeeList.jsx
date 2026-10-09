import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiUserPlus, FiRefreshCw, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { employeeService } from '../services/employeeService';
import EmployeeTable from '../components/employees/EmployeeTable';
import EmployeeSearch from '../components/employees/EmployeeSearch';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import ConfirmDialog from '../components/common/ConfirmDialog';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    employee: null,
    isDeleting: false,
  });

  const fetchEmployees = async (config = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await employeeService.getAllEmployees(config);
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        // Ignore aborted requests from StrictMode / unmount
        return;
      }
      console.error('Error loading employees:', err);
      setError(
        err.response?.data?.message || err.message || 'Failed to fetch employee list from backend API.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchEmployees({ signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, []);

  // Compute unique departments list for filter dropdown
  const uniqueDepartments = Array.from(
    new Set(employees.map((emp) => emp.department).filter(Boolean))
  ).sort();

  // Filter employees based on search text and department filter
  const filteredEmployees = employees.filter((emp) => {
    const searchLower = searchTerm.toLowerCase().trim();
    const nameMatch = emp.name ? emp.name.toLowerCase().includes(searchLower) : false;
    const emailMatch = emp.email ? emp.email.toLowerCase().includes(searchLower) : false;
    const deptMatch = emp.department ? emp.department.toLowerCase().includes(searchLower) : false;

    const matchesSearch = !searchLower || nameMatch || emailMatch || deptMatch;
    const matchesDept = !selectedDepartment || emp.department === selectedDepartment;

    return matchesSearch && matchesDept;
  });

  // Handle Delete Request Initiation
  const handleDeleteClick = (employee) => {
    setDeleteModal({
      isOpen: true,
      employee,
      isDeleting: false,
    });
  };

  // Confirm Delete Action
  const handleConfirmDelete = async () => {
    if (!deleteModal.employee) return;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    
    try {
      await employeeService.deleteEmployee(deleteModal.employee.id);
      setSuccessMessage(`Employee "${deleteModal.employee.name}" was deleted successfully.`);
      
      // Remove deleted item from local state
      setEmployees((prev) => prev.filter((e) => e.id !== deleteModal.employee.id));
      
      // Auto dismiss success toast after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Delete employee error:', err);
      setError(
        err.response?.data?.message || 'Failed to delete employee. Please try again.'
      );
    } finally {
      setDeleteModal({ isOpen: false, employee: null, isDeleting: false });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Employee Directory
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage, search, and view all registered staff members
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={fetchEmployees}
            disabled={loading}
            icon={FiRefreshCw}
          >
            Refresh
          </Button>

          <Link to="/employees/add">
            <Button variant="primary" icon={FiUserPlus}>
              Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <FiCheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button 
            onClick={() => setSuccessMessage('')} 
            className="text-emerald-700 text-xs font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* API Error State Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="danger" size="small" onClick={fetchEmployees}>
            Retry Request
          </Button>
        </div>
      )}

      {/* Search & Filter Inputs */}
      <EmployeeSearch
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedDepartment={selectedDepartment}
        onDepartmentChange={setSelectedDepartment}
        departments={uniqueDepartments}
        onClear={() => {
          setSearchTerm('');
          setSelectedDepartment('');
        }}
      />

      {/* Table Content or Loading Spinner */}
      {loading ? (
        <LoadingSpinner text="Fetching employee records..." />
      ) : (
        <EmployeeTable
          employees={filteredEmployees}
          onDeleteClick={handleDeleteClick}
        />
      )}

      {/* Styled Delete Confirmation Dialog Modal */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        title="Delete Employee Record"
        message={`Are you sure you want to delete employee "${deleteModal.employee?.name}" (ID: #${deleteModal.employee?.id})? This action cannot be undone.`}
        confirmText="Confirm Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, employee: null, isDeleting: false })}
        isLoading={deleteModal.isDeleting}
        variant="danger"
      />
    </div>
  );
};

export default EmployeeList;
