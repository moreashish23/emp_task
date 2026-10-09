import React, { useState, useEffect } from 'react';
import { 
  FiUser, 
  FiMail, 
  FiBriefcase, 
  FiDollarSign, 
  FiPhone, 
  FiSave, 
  FiArrowLeft,
  FiAlertCircle
} from 'react-icons/fi';
import InputField from '../common/InputField';
import Button from '../common/Button';
import { validateEmail, validatePhone } from '../../utils/formatters';

const EmployeeForm = ({
  initialValues = {
    name: '',
    email: '',
    department: '',
    salary: '',
    phone: '',
  },
  onSubmit,
  onCancel,
  isEdit = false,
  isLoading = false,
  apiError = null,
}) => {
  const [formData, setFormData] = useState({
    name: initialValues?.name || '',
    email: initialValues?.email || '',
    department: initialValues?.department || '',
    salary: initialValues?.salary !== undefined && initialValues?.salary !== null ? String(initialValues.salary) : '',
    phone: initialValues?.phone || '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEdit && initialValues) {
      setFormData({
        name: initialValues.name || '',
        email: initialValues.email || '',
        department: initialValues.department || '',
        salary: initialValues.salary !== undefined && initialValues.salary !== null ? String(initialValues.salary) : '',
        phone: initialValues.phone || '',
      });
    }
  }, [initialValues?.id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for edited field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

  
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!validateEmail(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    if (!formData.salary.trim()) {
      newErrors.salary = 'Salary is required';
    } else if (isNaN(Number(formData.salary)) || Number(formData.salary) < 0) {
      newErrors.salary = 'Salary must be a valid non-negative number';
    }

    if (formData.phone && formData.phone.trim() !== '') {
      if (!validatePhone(formData.phone.trim())) {
        newErrors.phone = 'Please enter a valid 10-digit phone number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      department: formData.department.trim(),
      salary: Number(formData.salary),
      phone: formData.phone.trim() || null,
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8">
      {/* Backend API Error Banner */}
      {apiError && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start space-x-3">
          <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold">Submission Failed:</span>{' '}
            {typeof apiError === 'string' ? apiError : apiError?.message || 'An unexpected error occurred.'}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Name */}
        <InputField
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Rahul Sharma"
          required
          icon={FiUser}
          error={errors.name}
          disabled={isLoading}
        />

        {/* Email Address */}
        <InputField
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="e.g. rahul.sharma@company.com"
          required
          icon={FiMail}
          error={errors.email}
          disabled={isLoading}
        />

        {/* Department */}
        <InputField
          label="Department"
          name="department"
          value={formData.department}
          onChange={handleChange}
          placeholder="e.g. Engineering, HR, Finance"
          required
          icon={FiBriefcase}
          error={errors.department}
          disabled={isLoading}
        />

        {/* Salary */}
        <InputField
          label="Salary (₹)"
          name="salary"
          type="number"
          value={formData.salary}
          onChange={handleChange}
          placeholder="e.g. 750000"
          required
          icon={FiDollarSign}
          error={errors.salary}
          disabled={isLoading}
          min="0"
          step="any"
        />

        {/* Phone */}
        <InputField
          label="Phone Number"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          placeholder="e.g. 9876543210"
          icon={FiPhone}
          error={errors.phone}
          disabled={isLoading}
          helperText="10-digit mobile number"
        />
      </div>
      
      <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-end space-x-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            disabled={isLoading}
            icon={FiArrowLeft}
          >
            Cancel
          </Button>
        )}

        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          icon={FiSave}
        >
          {isEdit ? 'Update Employee' : 'Save Employee'}
        </Button>
      </div>
    </form>
  );
};

export default EmployeeForm;
