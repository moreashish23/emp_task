import api from './api';

export const authService = {
  /**
   * User login request
   * @param {Object} credentials - { email, password }
   */
  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    if (response.data && response.data.token) {
      const { token, email, role } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ email, role: role || 'ROLE_USER' }));
    }
    return response.data;
  },

  /**
   * User registration request
   * @param {Object} userData - { email, password }
   */
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

 
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },


  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('token');
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
  }
};
