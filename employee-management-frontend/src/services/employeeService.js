import api from './api';

export const employeeService = {
  /**
   * Fetch all employees
   * GET /employees
   */
  async getAllEmployees(config = {}) {
    const response = await api.get('/employees', config);
    return response.data;
  },

  /**
   * Fetch a single employee by ID
   * GET /employees/{id}
   */
  async getEmployeeById(id, config = {}) {
    const response = await api.get(`/employees/${id}`, config);
    return response.data;
  },

  /**
   * Create a new employee
   * POST /employees
   */
  async createEmployee(employeeData, config = {}) {
    const response = await api.post('/employees', employeeData, config);
    return response.data;
  },

  /**
   * Update an existing employee
   * PUT /employees/{id}
   */
  async updateEmployee(id, employeeData, config = {}) {
    const response = await api.put(`/employees/${id}`, employeeData, config);
    return response.data;
  },

  /**
   * Delete an employee by ID
   * DELETE /employees/{id}
   */
  async deleteEmployee(id, config = {}) {
    const response = await api.delete(`/employees/${id}`, config);
    return response.data;
  }
};
