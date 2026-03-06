const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const authService = {
  // Guardar tokens en localStorage
  setTokens(accessToken, refreshToken) {
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  },

  // Obtener access token
  getToken() {
    return localStorage.getItem('accessToken');
  },

  // Obtener refresh token
  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  },

  // Remover tokens y usuario
  removeTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  // Guardar usuario
  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Obtener usuario
  getUser() {
    try {
      const user = localStorage.getItem('user');
      if (!user || user === 'undefined' || user === 'null') {
        return null;
      }
      return JSON.parse(user);
    } catch (e) {
      // Si hay error al parsear, limpiar y retornar null
      localStorage.removeItem('user');
      return null;
    }
  },

  // Verificar si está autenticado
  isAuthenticated() {
    return !!this.getToken();
  },

  // Procesar respuesta de autenticación del backend
  handleAuthResponse(apiResponse) {
    const data = apiResponse.data;

    // Guardar tokens
    this.setTokens(data.accessToken, data.refreshToken);

    // Crear objeto de usuario desde la respuesta
    const user = {
      id: data.userId,
      username: data.username,
      email: data.email,
      roles: data.roles || []
    };
    this.setUser(user);

    return { user, accessToken: data.accessToken };
  },

  // Login
  async login(usernameOrEmail, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ usernameOrEmail, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error en login');
    }

    const apiResponse = await response.json();
    return this.handleAuthResponse(apiResponse);
  },

  // Registro
  async register(userData) {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName || '',
        lastName: userData.lastName || ''
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error en registro');
    }

    const apiResponse = await response.json();
    return this.handleAuthResponse(apiResponse);
  },

  // Refresh token
  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      this.removeTokens();
      throw new Error('Failed to refresh token');
    }

    const apiResponse = await response.json();
    return this.handleAuthResponse(apiResponse);
  },

  // Logout
  async logout() {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      this.removeTokens();
      window.location.href = '/login';
    }
  },

  // Verificar si tiene un rol específico
  hasRole(role) {
    const user = this.getUser();
    if (!user || !user.roles) return false;

    // El backend envía roles como "ROLE_ADMIN", "ROLE_USER"
    const roleToCheck = role.startsWith('ROLE_') ? role : `ROLE_${role.toUpperCase()}`;
    return user.roles.includes(roleToCheck);
  },

  // Verificar si es admin
  isAdmin() {
    return this.hasRole('ROLE_ADMIN');
  },

  // Verificar si es usuario normal
  isUser() {
    return this.hasRole('ROLE_USER');
  }
};

export default authService;
