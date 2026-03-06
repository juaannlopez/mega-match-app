import { useState, useEffect } from 'react';
import { userService, userMatchService, userFavoriteTeamService, userFavoriteLeagueService } from '../services/api';
import authService from '../services/authService';
import MatchCard from '../components/MatchCard';
import './Profile.css';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    bio: ''
  });
  const [favoriteTeams, setFavoriteTeams] = useState([]);
  const [favoriteLeagues, setFavoriteLeagues] = useState([]);
  const [favoriteMatches, setFavoriteMatches] = useState([]);

  const localUser = authService.getUser();

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      // Cargar datos del usuario actual, perfil público y favoritos
      const [currentUserRes, publicProfileRes, teamsRes, leaguesRes, favoriteMatchesRes] = await Promise.all([
        userService.getCurrentUser(),
        userService.getPublicProfile(localUser?.username),
        userFavoriteTeamService.getFavoriteTeams(),
        userFavoriteLeagueService.getFavoriteLeagues(),
        userMatchService.getFavoriteMatches(0, 10)
      ]);

      setUserDetails(currentUserRes.data);
      setProfile(publicProfileRes.data);
      setFavoriteTeams(teamsRes.data || []);
      setFavoriteLeagues(leaguesRes.data || []);
      setFavoriteMatches(favoriteMatchesRes.data?.content || favoriteMatchesRes.data || []);

      // Inicializar formulario de edición
      setEditForm({
        firstName: currentUserRes.data.firstName || '',
        lastName: currentUserRes.data.lastName || '',
        bio: currentUserRes.data.bio || ''
      });
    } catch (error) {
      console.error('Error al cargar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveProfile = async () => {
    try {
      const response = await userService.updateProfile(editForm);
      setUserDetails(response.data);
      setIsEditing(false);
      // Recargar perfil público para actualizar stats
      loadProfileData();
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      alert('Error al actualizar el perfil');
    }
  };

  // Obtener inicial para avatar
  const getAvatarInitial = () => {
    if (userDetails?.firstName) {
      return userDetails.firstName.charAt(0).toUpperCase();
    }
    if (userDetails?.username) {
      return userDetails.username.charAt(0).toUpperCase();
    }
    return '?';
  };

  // Obtener nombre completo o username
  const getDisplayName = () => {
    if (userDetails?.firstName || userDetails?.lastName) {
      return `${userDetails.firstName || ''} ${userDetails.lastName || ''}`.trim();
    }
    return userDetails?.username || '';
  };

  // Verificar si es admin
  const isAdmin = () => {
    if (!userDetails?.roles) return false;
    // roles puede ser un array
    if (Array.isArray(userDetails.roles)) {
      return userDetails.roles.includes('ROLE_ADMIN');
    }
    return false;
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Eliminar equipo de favoritos
  const handleRemoveFavoriteTeam = async (teamExternalId) => {
    try {
      await userFavoriteTeamService.removeFavoriteTeam(teamExternalId);
      setFavoriteTeams(prev => prev.filter(t => t.teamExternalId !== teamExternalId));
    } catch (error) {
      console.error('Error al eliminar equipo favorito:', error);
    }
  };

  // Eliminar liga de favoritos
  const handleRemoveFavoriteLeague = async (leagueExternalId) => {
    try {
      await userFavoriteLeagueService.removeFavoriteLeague(leagueExternalId);
      setFavoriteLeagues(prev => prev.filter(l => l.leagueExternalId !== leagueExternalId));
    } catch (error) {
      console.error('Error al eliminar liga favorita:', error);
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">Cargando perfil...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        {userDetails?.avatarUrl ? (
          <img src={userDetails.avatarUrl} alt="Avatar" className="profile-avatar-img" />
        ) : (
          <div className="profile-avatar">
            {getAvatarInitial()}
          </div>
        )}
        <div className="profile-info">
          <h1>{getDisplayName()}</h1>
          <p className="profile-username">@{userDetails?.username}</p>
          <p className="profile-email">{userDetails?.email}</p>
          {userDetails?.bio && (
            <p className="profile-bio">{userDetails.bio}</p>
          )}
          <p className="profile-role">
            {isAdmin() ? '👑 Administrador' : '⚽ Usuario'}
          </p>
          <p className="profile-member-since">
            Miembro desde: {formatDate(profile?.memberSince || userDetails?.createdAt)}
          </p>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn-edit-profile"
          >
            {isEditing ? 'Cancelar' : 'Editar Perfil'}
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="edit-profile-form">
          <h3>Editar Perfil</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">Nombre</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={editForm.firstName}
                onChange={handleEditChange}
                placeholder="Tu nombre"
                maxLength={100}
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Apellido</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={editForm.lastName}
                onChange={handleEditChange}
                placeholder="Tu apellido"
                maxLength={100}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={editForm.bio}
              onChange={handleEditChange}
              placeholder="Cuéntanos sobre ti..."
              maxLength={500}
              rows={3}
            />
          </div>
          <button onClick={handleSaveProfile} className="btn-save-profile">
            Guardar Cambios
          </button>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👁️</div>
          <div className="stat-content">
            <div className="stat-number">{profile?.matchesWatched || 0}</div>
            <div className="stat-label">Partidos vistos</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💬</div>
          <div className="stat-content">
            <div className="stat-number">{profile?.commentsCount || 0}</div>
            <div className="stat-label">Comentarios</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-number">
              {profile?.averageRating ? profile.averageRating.toFixed(1) : '0.0'}
            </div>
            <div className="stat-label">Rating promedio</div>
          </div>
        </div>
      </div>

      {/* Sección de Partidos Favoritos */}
      <div className="favorites-section">
        <h2>Partidos Favoritos</h2>
        {favoriteMatches.length > 0 ? (
          <div className="favorite-matches-grid">
            {favoriteMatches.map((userMatch) => (
              <MatchCard
                key={userMatch.match?.id || userMatch.id}
                match={userMatch.match}
                userMatch={userMatch}
                onUpdate={loadProfileData}
              />
            ))}
          </div>
        ) : (
          <p className="no-favorites">No tienes partidos favoritos aún</p>
        )}
      </div>

      {/* Sección de Equipos Favoritos */}
      <div className="favorites-section">
        <h2>Equipos Favoritos</h2>
        {favoriteTeams.length > 0 ? (
          <div className="favorites-grid">
            {favoriteTeams.map((team) => (
              <div key={team.teamExternalId} className="favorite-item">
                {team.teamLogo ? (
                  <img src={team.teamLogo} alt={team.teamName} className="favorite-logo" />
                ) : (
                  <div className="favorite-logo-placeholder">
                    {team.teamName?.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="favorite-name">{team.teamName}</span>
                <span className="favorite-type">
                  {team.teamType === 'NATIONAL' ? '🏳️' : '🏟️'}
                </span>
                <button
                  onClick={() => handleRemoveFavoriteTeam(team.teamExternalId)}
                  className="btn-remove-favorite"
                  title="Eliminar de favoritos"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-favorites">No tienes equipos favoritos aún</p>
        )}
      </div>

      {/* Sección de Ligas Favoritas */}
      <div className="favorites-section">
        <h2>Ligas Favoritas</h2>
        {favoriteLeagues.length > 0 ? (
          <div className="favorites-grid">
            {favoriteLeagues.map((league) => (
              <div key={league.leagueExternalId} className="favorite-item">
                {league.leagueLogo ? (
                  <img src={league.leagueLogo} alt={league.leagueName} className="favorite-logo" />
                ) : (
                  <div className="favorite-logo-placeholder">
                    {league.leagueName?.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="favorite-name">{league.leagueName}</span>
                {league.country && (
                  <span className="favorite-country">{league.country}</span>
                )}
                <button
                  onClick={() => handleRemoveFavoriteLeague(league.leagueExternalId)}
                  className="btn-remove-favorite"
                  title="Eliminar de favoritos"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-favorites">No tienes ligas favoritas aún</p>
        )}
      </div>
    </div>
  );
}

export default Profile;
