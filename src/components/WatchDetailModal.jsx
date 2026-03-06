import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { userMatchService } from '../services/api';
import './WatchDetailModal.css';

function WatchDetailModal({ match, userMatch, isOpen, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [detailForm, setDetailForm] = useState({
    comment: '',
    watchType: 'completo',
    selectedMinutes: [], // Array de minutos seleccionados [15, 30, 45, 60, 75, 90]
    extraTime: [], // Array: ['1et', '2et', 'penales']
  });

  // Determinar si usar external ID o local ID
  const isExternalMatch = !match?.id && match?.externalId;

  // Detectar si el partido tuvo tiempo extra
  const hasExtraTime = match?.status === 'AET' || match?.status === 'PEN' ||
                       (match?.minute && match?.minute > 90) ||
                       match?.hasExtraTime;

  // Reset form cuando se abre el modal
  useEffect(() => {
    if (isOpen && match) {
      setDetailForm({
        comment: userMatch?.comment || '',
        watchType: 'completo',
        selectedMinutes: [],
        extraTime: [],
      });
    }
  }, [isOpen, match, userMatch]);

  // Función para toggle de minuto individual
  const toggleMinute = (minute) => {
    setDetailForm(prev => ({
      ...prev,
      selectedMinutes: prev.selectedMinutes.includes(minute)
        ? prev.selectedMinutes.filter(m => m !== minute)
        : [...prev.selectedMinutes, minute].sort((a, b) => a - b)
    }));
  };

  // Función para seleccionar PT (primeros 3: 15, 30, 45)
  const selectPT = () => {
    const ptMinutes = [15, 30, 45];
    setDetailForm(prev => {
      const hasAllPT = ptMinutes.every(m => prev.selectedMinutes.includes(m));
      if (hasAllPT) {
        // Si ya tiene todos, los quita
        return {
          ...prev,
          selectedMinutes: prev.selectedMinutes.filter(m => !ptMinutes.includes(m))
        };
      } else {
        // Si no tiene todos, los agrega
        const newMinutes = [...new Set([...prev.selectedMinutes, ...ptMinutes])].sort((a, b) => a - b);
        return { ...prev, selectedMinutes: newMinutes };
      }
    });
  };

  // Función para seleccionar ST (últimos 3: 60, 75, 90)
  const selectST = () => {
    const stMinutes = [60, 75, 90];
    setDetailForm(prev => {
      const hasAllST = stMinutes.every(m => prev.selectedMinutes.includes(m));
      if (hasAllST) {
        // Si ya tiene todos, los quita
        return {
          ...prev,
          selectedMinutes: prev.selectedMinutes.filter(m => !stMinutes.includes(m))
        };
      } else {
        // Si no tiene todos, los agrega
        const newMinutes = [...new Set([...prev.selectedMinutes, ...stMinutes])].sort((a, b) => a - b);
        return { ...prev, selectedMinutes: newMinutes };
      }
    });
  };

  // Función para toggle de tiempo extra
  const toggleExtraTime = (type) => {
    setDetailForm(prev => ({
      ...prev,
      extraTime: prev.extraTime.includes(type)
        ? prev.extraTime.filter(t => t !== type)
        : [...prev.extraTime, type]
    }));
  };

  // Verificar si PT está completamente seleccionado
  const isPTSelected = [15, 30, 45].every(m => detailForm.selectedMinutes.includes(m));
  // Verificar si ST está completamente seleccionado
  const isSTSelected = [60, 75, 90].every(m => detailForm.selectedMinutes.includes(m));

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDetailSubmit = async (e) => {
    e.preventDefault();
    if (!match) return;

    setLoading(true);
    try {
      const localMatchId = userMatch?.matchId || match.id;
      const isWatched = userMatch?.watched;

      // Primero marcar como visto si no lo está
      if (!isWatched) {
        if (isExternalMatch) {
          await userMatchService.markAsWatchedByExternalId(match.externalId);
        } else {
          await userMatchService.markAsWatched(match.id);
        }
      }

      // Construir comentario con detalles
      let watchDetails = '';
      if (detailForm.watchType === 'completo') {
        watchDetails = '[Visto: Completo]';
      } else {
        const parts = [];

        // Minutos del partido regular
        if (detailForm.selectedMinutes.length > 0) {
          const hasPT = [15, 30, 45].every(m => detailForm.selectedMinutes.includes(m));
          const hasST = [60, 75, 90].every(m => detailForm.selectedMinutes.includes(m));

          if (hasPT && hasST) {
            parts.push('PT + ST');
          } else if (hasPT) {
            parts.push('PT');
          } else if (hasST) {
            parts.push('ST');
          } else {
            parts.push(`Min: ${detailForm.selectedMinutes.map(m => m + "'").join(', ')}`);
          }
        }

        // Tiempo extra
        if (detailForm.extraTime.length > 0) {
          const extraLabels = {
            '1et': '1°ET',
            '2et': '2°ET',
            'penales': 'Penales'
          };
          const extraParts = detailForm.extraTime.map(t => extraLabels[t] || t);
          parts.push(extraParts.join(' + '));
        }

        watchDetails = parts.length > 0 ? `[Visto: Parcial - ${parts.join(', ')}]` : '[Visto: Parcial]';
      }

      const finalComment = detailForm.comment
        ? `${watchDetails} ${detailForm.comment}`
        : watchDetails;

      if (localMatchId || match.id) {
        await userMatchService.updateUserMatch(localMatchId || match.id, {
          comment: finalComment
        });
      }

      onUpdate && onUpdate();
      onClose();
    } catch (error) {
      console.error('Error al guardar detalles:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !match) return null;

  const modalContent = (
    <div className="watch-modal-overlay" onClick={onClose}>
      <div className="watch-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="watch-modal-header">
          <h2>Marcar partido como visto</h2>
          <button className="watch-modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Resultado del partido */}
        <div className="watch-modal-result">
          <div className="watch-modal-team">
            {match.homeTeamLogo ? (
              <img src={match.homeTeamLogo} alt={match.homeTeam} className="watch-modal-team-logo" />
            ) : (
              <div className="watch-modal-team-badge">{match.homeTeam?.substring(0, 2).toUpperCase()}</div>
            )}
            <span className="watch-modal-team-name">{match.homeTeam}</span>
          </div>
          <div className="watch-modal-score">
            <span className="watch-modal-score-number">{match.homeScore ?? '-'}</span>
            <span className="watch-modal-score-separator">-</span>
            <span className="watch-modal-score-number">{match.awayScore ?? '-'}</span>
          </div>
          <div className="watch-modal-team">
            {match.awayTeamLogo ? (
              <img src={match.awayTeamLogo} alt={match.awayTeam} className="watch-modal-team-logo" />
            ) : (
              <div className="watch-modal-team-badge">{match.awayTeam?.substring(0, 2).toUpperCase()}</div>
            )}
            <span className="watch-modal-team-name">{match.awayTeam}</span>
          </div>
        </div>

        <div className="watch-modal-competition">
          {match.competition}
        </div>

        <form onSubmit={handleDetailSubmit} className="watch-modal-form">
          {/* Tipo de visualización: Completo o Parcial */}
          <div className="watch-modal-section">
            <label className="watch-modal-label">¿Cuánto viste del partido?</label>
            <div className="watch-type-grid">
              <label className={`watch-type-btn ${detailForm.watchType === 'completo' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="watchType"
                  value="completo"
                  checked={detailForm.watchType === 'completo'}
                  onChange={() => setDetailForm(prev => ({ ...prev, watchType: 'completo', selectedMinutes: [], extraTime: [] }))}
                />
                <span className="material-symbols-outlined">check_circle</span>
                <span>COMPLETO</span>
              </label>
              <label className={`watch-type-btn ${detailForm.watchType === 'parcial' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="watchType"
                  value="parcial"
                  checked={detailForm.watchType === 'parcial'}
                  onChange={() => setDetailForm(prev => ({ ...prev, watchType: 'parcial' }))}
                />
                <span className="material-symbols-outlined">timelapse</span>
                <span>PARCIAL</span>
              </label>
            </div>
          </div>

          {/* Más detalles - solo si es parcial */}
          {detailForm.watchType === 'parcial' && (
            <div className="watch-modal-section watch-modal-details">
              <label className="watch-modal-label">Más detalles</label>

              {/* Botones PT y ST */}
              <div className="half-buttons">
                <button
                  type="button"
                  className={`half-btn ${isPTSelected ? 'selected' : ''}`}
                  onClick={selectPT}
                >
                  PT
                </button>
                <button
                  type="button"
                  className={`half-btn ${isSTSelected ? 'selected' : ''}`}
                  onClick={selectST}
                >
                  ST
                </button>
              </div>

              {/* Minutos individuales */}
              <div className="minutes-options">
                {[15, 30, 45, 60, 75, 90].map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    className={`minute-btn ${detailForm.selectedMinutes.includes(minute) ? 'selected' : ''}`}
                    onClick={() => toggleMinute(minute)}
                  >
                    {minute}'
                  </button>
                ))}
              </div>

              {/* Tiempo extra y penales - siempre visible en parcial */}
              <div className="watch-modal-sublabel extra">Tiempo extra:</div>
              <div className="extra-options">
                <button
                  type="button"
                  className={`extra-btn ${detailForm.extraTime.includes('1et') ? 'selected' : ''}`}
                  onClick={() => toggleExtraTime('1et')}
                >
                  1°ET
                </button>
                <button
                  type="button"
                  className={`extra-btn ${detailForm.extraTime.includes('2et') ? 'selected' : ''}`}
                  onClick={() => toggleExtraTime('2et')}
                >
                  2°ET
                </button>
                <button
                  type="button"
                  className={`extra-btn penales ${detailForm.extraTime.includes('penales') ? 'selected' : ''}`}
                  onClick={() => toggleExtraTime('penales')}
                >
                  PENALES
                </button>
              </div>
            </div>
          )}

          {/* Comentario */}
          <div className="watch-modal-section">
            <label className="watch-modal-label">Comentario (opcional)</label>
            <textarea
              className="watch-modal-textarea"
              placeholder="Escribe tus comentarios sobre el partido..."
              value={detailForm.comment}
              onChange={(e) => setDetailForm(prev => ({ ...prev, comment: e.target.value }))}
            />
          </div>

          {/* Botones */}
          <div className="watch-modal-actions">
            <button type="button" className="watch-modal-btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="watch-modal-btn-save" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Usar portal para renderizar el modal fuera del componente
  return createPortal(modalContent, document.body);
}

export default WatchDetailModal;
