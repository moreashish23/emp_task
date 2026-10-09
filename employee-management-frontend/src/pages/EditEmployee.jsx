import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { employeeService } from '../services/employeeService';
import EmployeeForm from '../components/employees/EmployeeForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import { FiAlertCircle, FiArrowLeft } from 'react-icons/fi';

const EditEmployee = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const data = await employeeService.getEmployeeById(id);
        setInitialData(data);
      } catch (err) {
        console.error('Fetch employee error:', err);
        setFetchError(
          err.response?.status === 404
            ? `Employee with ID #${id} was not found.`
            : err.response?.data?.message || 'Failed to load employee details.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEmployee();
    }
  }, [id]);

  const handleSubmit = async (updatedData) => {
    setSubmitting(true);
    setApiError(null);
    try {
      // Preserve ID and existing timestamps if present
      const payload = {
        ...initialData,
        ...updatedData,
      };

      await employeeService.updateEmployee(id, payload);
      navigate('/employees');
    } catch (err) {
      console.error('Update employee error:', err);
      setApiError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to update employee details.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text={`Loading employee details for ID #${id}...`} />;
  }

  if (fetchError) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiAlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Employee Not Found</h3>
        <p className="text-slate-500 text-sm mt-2 mb-6">{fetchError}</p>
        <Button
          variant="primary"
          onClick={() => navigate('/employees')}
          icon={FiArrowLeft}
        >
          Return to Employee Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Edit Employee Profile
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Updating information for employee <span className="font-semibold text-slate-800">#{id} - {initialData?.name}</span>
        </p>
      </div>

      <EmployeeForm
        initialValues={initialData}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/employees')}
        isEdit={true}
        isLoading={submitting}
        apiError={apiError}
      />
    </div>
  );
};

export default EditEmployee;
