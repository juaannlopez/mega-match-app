import { useState, useRef, useEffect } from 'react';
import { userMatchService } from '../services/api';
import './MatchCard.css';

function MatchCard({ match, userMatch, onUpdate, onOpenWatchDetail }) {
  const [isWatched, setIsWatched] = useState(userMatch?.watched || false);
  const [userRating, setUserRating] = useState(userMatch?.rating || 0);
  const [isFavorite, setIsFavorite] = useState(userMatch?.favorite || false);
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Determinar si usar external ID o local ID
  const isExternalMatch = !match.id && match.externalId;

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleWatchedToggle = async () => {
    setLoading(true);
    try {
      if (isWatched) {
        // Para eliminar, necesitamos el ID local del userMatch
        if (userMatch?.matchId) {
          await userMatchService.deleteUserMatch(userMatch.matchId);
        } else if (match.id) {
          await userMatchService.deleteUserMatch(match.id);
        }
        setIsWatched(false);
        setUserRating(0);
        setIsFavorite(false);
      } else {
        // Marcar como visto: usar endpoint según tipo de match
        if (isExternalMatch) {
          await userMatchService.markAsWatchedByExternalId(match.externalId);
        } else {
          await userMatchService.markAsWatched(match.id);
        }
        setIsWatched(true);
      }
      onUpdate && onUpdate();
    } catch (error) {
      console.error('Error al marcar partido:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRating = async (rating) => {
    if (!isWatched) return;

    setLoading(true);
    try {
      // Para rating necesitamos el ID local del match
      const localMatchId = userMatch?.matchId || match.id;
      if (localMatchId) {
        await userMatchService.rateMatch(localMatchId, rating);
        setUserRating(rating);
        onUpdate && onUpdate();
      }
    } catch (error) {
      console.error('Error al calificar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    setLoading(true);
    try {
      // Toggle favorito: usar endpoint según tipo de match
      if (isExternalMatch) {
        await userMatchService.toggleFavoriteByExternalId(match.externalId);
      } else {
        await userMatchService.toggleFavorite(match.id);
      }
      setIsFavorite(!isFavorite);
      // Si no estaba marcado como visto, ahora lo estará (el backend lo hace automáticamente)
      if (!isWatched) {
        setIsWatched(true);
      }
      onUpdate && onUpdate();
    } catch (error) {
      console.error('Error al marcar favorito:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetailModal = () => {
    setShowMenu(false);
    onOpenWatchDetail && onOpenWatchDetail(match);
  };

  const getMatchStatus = () => {
    // Usar status del backend si está disponible (ExternalMatch)
    if (match.status) {
      switch (match.status) {
        case 'LIVE':
        case 'IN_PLAY':
        case '1H':
        case '2H':
        case 'HT':
          return { label: match.minute ? `${match.minute}'` : 'LIVE', type: 'live' };
        case 'FINISHED':
        case 'FT':
          return { label: 'FT', type: 'finished' };
        case 'SCHEDULED':
        case 'NS':
          const matchTime = new Date(match.matchDate);
          return { label: matchTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), type: 'upcoming' };
        case 'POSTPONED':
          return { label: 'POSTPD', type: 'postponed' };
        case 'CANCELLED':
          return { label: 'CANC', type: 'cancelled' };
        default:
          return { label: match.status, type: 'unknown' };
      }
    }

    // Fallback para Match local (sin status)
    if (!match.matchDate) return null;

    const matchDate = new Date(match.matchDate);
    const now = new Date();
    const diffHours = (now - matchDate) / (1000 * 60 * 60);

    if (match.homeScore !== null && match.awayScore !== null) {
      return { label: 'FT', type: 'finished' };
    }

    if (diffHours >= 0 && diffHours < 2) {
      const minutes = Math.floor(diffHours * 60);
      return { label: `${minutes}'`, type: 'live' };
    }

    if (diffHours < 0) {
      return { label: 'Upcoming', type: 'upcoming' };
    }

    return { label: 'FT', type: 'finished' };
  };

  const status = getMatchStatus();
  const isLive = status?.type === 'live';

  return (
    <div className={`match-card glass-panel ${isLive ? 'live' : ''} ${isWatched ? 'watched' : ''}`}>
      {/* Card Header */}
      <div className="card-header">
        <div className="card-header-left">
          {match.competitionLogo ? (
            <img src={match.competitionLogo} alt={match.competition} className="league-logo" />
          ) : (
            <span className="material-symbols-outlined league-icon">sports_soccer</span>
          )}
          <span className="league-name">{match.competition || 'League'}</span>
          <span className="separator">-</span>
          <span className={`match-time ${status?.type}`}>
            {status?.label}
          </span>
        </div>
        <div className="card-header-actions">
          <button
            onClick={handleFavoriteToggle}
            disabled={loading || (!isWatched && !isExternalMatch)}
            className={`favorite-btn ${isFavorite ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined" style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : {}}>
              star
            </span>
          </button>
          <div className="menu-container" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="menu-btn"
            >
              <span className="material-symbols-outlined">more_vert</span>
            </button>
            {showMenu && (
              <div className="dropdown-menu">
                <button onClick={handleOpenDetailModal} className="dropdown-item">
                  <span className="material-symbols-outlined">edit_note</span>
                  Marcar como visto con detalles
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Body - Teams & Score */}
      <div className="card-body">
        {/* Home Team */}
        <div className="team-side">
          {match.homeTeamLogo ? (
            <img src={match.homeTeamLogo} alt={match.homeTeam} className="team-logo-img" />
          ) : (
            <div className="team-logo">
              {match.homeTeam?.substring(0, 2).toUpperCase() || 'HM'}
            </div>
          )}
          <span className="team-name">{match.homeTeam || 'Home Team'}</span>
        </div>

        {/* Score */}
        <div className="score-section">
          <div className="score-display">
            <span className="score">{match.homeScore ?? '-'}</span>
            <span className="score-divider">-</span>
            <span className="score">{match.awayScore ?? '-'}</span>
          </div>
        </div>

        {/* Away Team */}
        <div className="team-side away">
          <span className="team-name">{match.awayTeam || 'Away Team'}</span>
          {match.awayTeamLogo ? (
            <img src={match.awayTeamLogo} alt={match.awayTeam} className="team-logo-img" />
          ) : (
            <div className="team-logo away">
              {match.awayTeam?.substring(0, 2).toUpperCase() || 'AW'}
            </div>
          )}
        </div>
      </div>

      {/* Card Actions */}
      {isWatched ? (
        <div className="card-actions watched">
          <div className="rating-section">
            <span className="rating-label">Tu rating</span>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  disabled={loading}
                  className={`star-btn ${star <= userRating ? 'active' : ''}`}
                >
                  <span className="material-symbols-outlined" style={star <= userRating ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    star
                  </span>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleWatchedToggle}
            disabled={loading}
            className="remove-btn"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      ) : (
        <div className="card-actions">
          <button
            onClick={handleWatchedToggle}
            disabled={loading}
            className="watch-btn"
          >
            <span className="material-symbols-outlined">add</span>
            Marcar como visto
          </button>
        </div>
      )}
    </div>
  );
}

export default MatchCard;
