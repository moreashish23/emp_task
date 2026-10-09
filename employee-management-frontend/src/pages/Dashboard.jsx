import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiUsers, 
  FiBriefcase, 
  FiDollarSign, 
  FiUserPlus, 
  FiList, 
  FiRefreshCw, 
  FiAlertCircle,
  FiTrendingUp,
  FiShield
} from 'react-icons/fi';
import { employeeService } from '../services/employeeService';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

const Dashboard = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async (config = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await employeeService.getAllEmployees(config);
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Error fetching dashboard employees:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard metrics from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboardData({ signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, []);

  // Calculate Real Metrics
  const totalEmployees = employees.length;

  const totalPayroll = employees.reduce((sum, emp) => sum + (Number(emp.salary) || 0), 0);
  const avgSalary = totalEmployees > 0 ? Math.round(totalPayroll / totalEmployees) : 0;

  // Group by department
  const departmentCounts = employees.reduce((acc, emp) => {
    const dept = emp.department || 'Unassigned';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  const totalDepartments = Object.keys(departmentCounts).length;

  // Recent employees (last 5, assuming descending ID or sorted array)
  const recentEmployees = [...employees]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  if (loading) {
    return <LoadingSpinner text="Computing dashboard metrics..." />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-blue-100">
            <FiShield className="w-3.5 h-3.5" />
            <span>Role: {user?.role || 'ROLE_USER'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, <span className="text-blue-600">{user?.email?.split('@')[0] || 'User'}</span>!
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Here is your live employee management overview based on actual database records.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={fetchDashboardData}
            icon={FiRefreshCw}
          >
            Refresh Data
          </Button>

          <Link to="/employees/add">
            <Button variant="primary" icon={FiUserPlus}>
              Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {/* Error state if API fails */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <FiAlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-base">Backend Connection Error</h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
          <Button variant="danger" size="small" onClick={fetchDashboardData}>
            Retry
          </Button>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Employees Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Staff
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                {totalEmployees}
              </h3>
            </div>
            <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <FiUsers className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Active database records</span>
            <Link to="/employees" className="text-blue-600 font-semibold hover:underline">
              View All &rarr;
            </Link>
          </div>
        </div>

        {/* Departments Count Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Departments
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                {totalDepartments}
              </h3>
            </div>
            <div className="p-3.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <FiBriefcase className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Categorized teams</span>
            <span className="font-semibold text-slate-700">{totalDepartments} Unique</span>
          </div>
        </div>

        {/* Average Salary Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Average Salary
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                {formatCurrency(avgSalary)}
              </h3>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <FiDollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total Payroll: {formatCurrency(totalPayroll)}</span>
            <FiTrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
       
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FiBriefcase className="w-5 h-5 text-blue-600" />
              <span>Department Distribution</span>
            </h3>

            {totalDepartments === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No department data available.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(departmentCounts).map(([dept, count]) => {
                  const percentage = totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0;
                  return (
                    <div key={dept}>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>{dept}</span>
                        <span>{count} staff ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link to="/employees" className="w-full inline-flex justify-center text-xs font-semibold text-blue-600 hover:text-blue-700">
              Manage Employee Records &rarr;
            </Link>
          </div>
        </div>

        {/* Recent Employees Table Preview */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FiList className="w-5 h-5 text-blue-600" />
                <span>Recently Added Employees</span>
              </h3>
              <Link 
                to="/employees" 
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                View All ({totalEmployees})
              </Link>
            </div>

            {recentEmployees.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No recent employee records.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase">
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Department</th>
                      <th className="py-2 px-3">Salary</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {recentEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{emp.name}</div>
                          <div className="text-xs text-slate-400">{emp.email}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                            {emp.department || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700">
                          {formatCurrency(emp.salary)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link 
                            to={`/employees/${emp.id}`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
