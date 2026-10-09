import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { employeeService } from '../services/employeeService';
import EmployeeDetails from '../components/employees/EmployeeDetails';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import { FiAlertCircle, FiArrowLeft } from 'react-icons/fi';

const EmployeeDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await employeeService.getEmployeeById(id);
        setEmployee(data);
      } catch (err) {
        console.error('Error fetching employee details:', err);
        setError(
          err.response?.status === 404
            ? `Employee with ID #${id} was not found.`
            : err.response?.data?.message || 'Failed to fetch employee details.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEmployee();
    }
  }, [id]);

  if (loading) {
    return <LoadingSpinner text={`Fetching profile for employee #${id}...`} />;
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiAlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Record Not Available</h3>
        <p className="text-slate-500 text-sm mt-2 mb-6">{error}</p>
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
    <div className="max-w-4xl mx-auto">
      <EmployeeDetails employee={employee} />
    </div>
  );
};

export default EmployeeDetailsPage;
