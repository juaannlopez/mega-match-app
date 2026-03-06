import axios from 'axios';
import authService from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Crear instancia de Axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag para evitar múltiples refresh simultáneos
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta y refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si es error 401 y no es un retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      // No intentar refresh en rutas de auth
      if (originalRequest.url?.includes('/auth/')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Si ya se está haciendo refresh, encolar la petición
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { accessToken } = await authService.refreshAccessToken();
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        authService.removeTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Helper para extraer data de ApiResponse
const extractData = (response) => {
  // El backend envuelve las respuestas en ApiResponse { success, message, data }
  if (response.data && response.data.data !== undefined) {
    return response.data.data;
  }
  return response.data;
};

// Servicios de API
export const matchService = {
  // Obtener todos los partidos (paginado con ordenamiento)
  async getAll(page = 0, size = 10, sortBy = 'matchDate', sortDir = 'desc') {
    const response = await api.get('/matches', {
      params: { page, size, sortBy, sortDir }
    });
    return { data: extractData(response) };
  },

  // Obtener un partido por ID
  async getById(id) {
    const response = await api.get(`/matches/${id}`);
    return { data: extractData(response) };
  },

  // Obtener partido por ID externo
  async getByExternalId(externalId) {
    const response = await api.get(`/matches/external/${externalId}`);
    return { data: extractData(response) };
  },

  // Buscar partidos por equipo
  async searchByTeam(team, page = 0, size = 10) {
    const response = await api.get('/matches/search', {
      params: { team, page, size }
    });
    return { data: extractData(response) };
  },

  // Obtener partidos por competición y temporada
  async getByCompetitionAndSeason(competition, season, page = 0, size = 10) {
    const response = await api.get(`/matches/competition/${competition}/season/${season}`, {
      params: { page, size }
    });
    return { data: extractData(response) };
  },

  // Crear partido (solo admin)
  // data: { externalId, homeTeam, awayTeam, homeScore, awayScore, competition, season, matchDate, stadium, thumbnailUrl }
  async create(matchData) {
    const response = await api.post('/matches', matchData);
    return { data: extractData(response) };
  },

  // Actualizar partido (solo admin)
  async update(id, matchData) {
    const response = await api.put(`/matches/${id}`, matchData);
    return { data: extractData(response) };
  },

  // Eliminar partido (solo admin)
  async delete(id) {
    const response = await api.delete(`/matches/${id}`);
    return { data: extractData(response) };
  },

  // Obtener partidos de hoy (desde API externa, paginado)
  async getTodayMatches(page = 0, size = 50) {
    // === MOCK DATE: Descomentar la siguiente línea para probar con fecha fija ===
     //const dateStr = '2026-01-16';
    // === FIN MOCK DATE ===

    // Comentar este bloque si usas la fecha mockeada
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`; // formato YYYY-MM-DD local
    const response = await api.get('/external/matches', {
      params: { date: dateStr, page, size }
    });
    return { data: extractData(response) };
  }
};

// Servicio para la relación usuario-partido
export const userMatchService = {
  // Obtener todos los partidos del usuario (paginado)
  async getUserMatches(page = 0, size = 10, sortBy = 'createdAt', sortDir = 'desc') {
    const response = await api.get('/user-matches', {
      params: { page, size, sortBy, sortDir }
    });
    return { data: extractData(response) };
  },

  // Obtener partidos vistos del usuario (paginado)
  async getWatchedMatches(page = 0, size = 10) {
    const response = await api.get('/user-matches/watched', {
      params: { page, size }
    });
    return { data: extractData(response) };
  },

  // Obtener partidos favoritos del usuario (paginado)
  async getFavoriteMatches(page = 0, size = 10) {
    const response = await api.get('/user-matches/favorites', {
      params: { page, size }
    });
    return { data: extractData(response) };
  },

  // Obtener relación usuario-partido específica
  async getUserMatch(matchId) {
    const response = await api.get(`/user-matches/match/${matchId}`);
    return { data: extractData(response) };
  },

  // Crear relación usuario-partido (agregar a lista)
  async createUserMatch(data) {
    // data: { matchId, watched, rating, comment, favorite }
    const response = await api.post('/user-matches', data);
    return { data: extractData(response) };
  },

  // Actualizar relación usuario-partido
  async updateUserMatch(matchId, data) {
    // data: { watched, rating, comment, favorite }
    const response = await api.put(`/user-matches/match/${matchId}`, data);
    return { data: extractData(response) };
  },

  // Eliminar relación usuario-partido
  async deleteUserMatch(matchId) {
    const response = await api.delete(`/user-matches/match/${matchId}`);
    return { data: extractData(response) };
  },

  // Marcar partido como visto
  async markAsWatched(matchId) {
    const response = await api.post(`/user-matches/match/${matchId}/watch`);
    return { data: extractData(response) };
  },

  // Toggle favorito
  async toggleFavorite(matchId) {
    const response = await api.post(`/user-matches/match/${matchId}/favorite`);
    return { data: extractData(response) };
  },

  // Helper: Calificar partido (actualiza el rating)
  async rateMatch(matchId, rating) {
    const response = await api.put(`/user-matches/match/${matchId}`, { rating });
    return { data: extractData(response) };
  },

  // Helper: Agregar comentario
  async commentMatch(matchId, comment) {
    const response = await api.put(`/user-matches/match/${matchId}`, { comment });
    return { data: extractData(response) };
  },

  // Marcar partido como visto por external ID (importa automáticamente si no existe)
  async markAsWatchedByExternalId(externalId) {
    const response = await api.post(`/user-matches/external/${externalId}/watch`);
    return { data: extractData(response) };
  },

  // Toggle favorito por external ID (importa automáticamente si no existe)
  async toggleFavoriteByExternalId(externalId) {
    const response = await api.post(`/user-matches/external/${externalId}/favorite`);
    return { data: extractData(response) };
  }
};

// Servicio para equipos favoritos del usuario
export const userFavoriteTeamService = {
  // Obtener todos los equipos favoritos (clubs y selecciones)
  async getFavoriteTeams() {
    const response = await api.get('/user/favorite-teams');
    return { data: extractData(response) };
  },

  // Obtener solo clubs favoritos
  async getFavoriteClubs() {
    const response = await api.get('/user/favorite-teams/clubs');
    return { data: extractData(response) };
  },

  // Obtener solo selecciones nacionales favoritas
  async getFavoriteNationalTeams() {
    const response = await api.get('/user/favorite-teams/national');
    return { data: extractData(response) };
  },

  // Agregar equipo a favoritos
  // data: { teamExternalId, teamName, teamLogo, teamType: 'CLUB' | 'NATIONAL' }
  async addFavoriteTeam(data) {
    const response = await api.post('/user/favorite-teams', data);
    return { data: extractData(response) };
  },

  // Eliminar equipo de favoritos
  async removeFavoriteTeam(teamExternalId) {
    const response = await api.delete(`/user/favorite-teams/${teamExternalId}`);
    return { data: extractData(response) };
  },

  // Toggle equipo favorito (agregar si no existe, eliminar si ya existe)
  // data: { teamExternalId, teamName, teamLogo, teamType: 'CLUB' | 'NATIONAL' }
  async toggleFavoriteTeam(data) {
    const response = await api.post('/user/favorite-teams/toggle', data);
    return { data: extractData(response) };
  },

  // Verificar si un equipo es favorito
  async isFavorite(teamExternalId) {
    const response = await api.get(`/user/favorite-teams/check/${teamExternalId}`);
    return { data: extractData(response) };
  }
};

// Servicio para ligas/competiciones favoritas del usuario
export const userFavoriteLeagueService = {
  // Obtener todas las ligas favoritas
  async getFavoriteLeagues() {
    const response = await api.get('/user/favorite-leagues');
    return { data: extractData(response) };
  },

  // Agregar liga a favoritos
  // data: { leagueExternalId, leagueName, leagueLogo, country }
  async addFavoriteLeague(data) {
    const response = await api.post('/user/favorite-leagues', data);
    return { data: extractData(response) };
  },

  // Eliminar liga de favoritos
  async removeFavoriteLeague(leagueExternalId) {
    const response = await api.delete(`/user/favorite-leagues/${leagueExternalId}`);
    return { data: extractData(response) };
  },

  // Toggle liga favorita (agregar si no existe, eliminar si ya existe)
  // data: { leagueExternalId, leagueName, leagueLogo, country }
  async toggleFavoriteLeague(data) {
    const response = await api.post('/user/favorite-leagues/toggle', data);
    return { data: extractData(response) };
  },

  // Verificar si una liga es favorita
  async isFavorite(leagueExternalId) {
    const response = await api.get(`/user/favorite-leagues/check/${leagueExternalId}`);
    return { data: extractData(response) };
  }
};

export const userService = {
  // Obtener usuario actual (privado, con email)
  async getCurrentUser() {
    const response = await api.get('/users/me');
    return { data: extractData(response) };
  },

  // Actualizar perfil del usuario actual
  async updateProfile(userData) {
    // userData: { firstName, lastName, bio, avatarUrl }
    const response = await api.put('/users/me', userData);
    return { data: extractData(response) };
  },

  // Obtener perfil público por username
  async getPublicProfile(username) {
    const response = await api.get(`/users/profile/${username}`);
    return { data: extractData(response) };
  },

  // Obtener perfil público por ID
  async getPublicProfileById(userId) {
    const response = await api.get(`/users/profile/id/${userId}`);
    return { data: extractData(response) };
  }
};

export default api;
