import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeeService } from '../services/employeeService';
import EmployeeForm from '../components/employees/EmployeeForm';

const AddEmployee = () => {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  const navigate = useNavigate();

  const handleSubmit = async (employeeData) => {
    setSubmitting(true);
    setApiError(null);
    try {
      await employeeService.createEmployee(employeeData);
      navigate('/employees');
    } catch (err) {
      console.error('Error creating employee:', err);
      if (err.response) {
        setApiError(
          err.response.data?.message || err.response.data?.error || 'Failed to create employee record. Check server constraints.'
        );
      } else if (err.request) {
        setApiError('Unable to connect to the backend server. Please verify your connection.');
      } else {
        setApiError('An unexpected error occurred while saving.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Add New Employee
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Enter the new employee's details to register them in the system
        </p>
      </div>

      <EmployeeForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/employees')}
        isLoading={submitting}
        apiError={apiError}
      />
    </div>
  );
};

export default AddEmployee;
