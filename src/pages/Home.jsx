import { useState, useEffect } from 'react';
import { matchService, userMatchService, userFavoriteLeagueService } from '../services/api';
import MatchCard from '../components/MatchCard';
import WatchDetailModal from '../components/WatchDetailModal';
import './Home.css';

function Home() {
  const [matches, setMatches] = useState([]);
  const [userMatches, setUserMatches] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeLeague, setActiveLeague] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [favoriteLeagues, setFavoriteLeagues] = useState([]);
  const [collapsedCompetitions, setCollapsedCompetitions] = useState({});
  const [watchDetailModal, setWatchDetailModal] = useState({ isOpen: false, match: null });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setSearchResults(null);
      setSearchTerm('');

      // Cargar partidos de hoy y ligas favoritas en paralelo
      const [matchesResponse, favoriteLeaguesResponse] = await Promise.all([
        matchService.getTodayMatches(0, 50),
        userFavoriteLeagueService.getFavoriteLeagues().catch(() => ({ data: [] }))
      ]);

      const matchesList = matchesResponse.data?.content || [];
      const favLeagues = favoriteLeaguesResponse.data || [];

      setMatches(matchesList);
      setFavoriteLeagues(favLeagues);

      await loadUserMatches();
    } catch (err) {
      setError('Error al cargar los partidos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserMatches = async () => {
    try {
      const userMatchesResponse = await userMatchService.getUserMatches(0, 100);
      const userMatchesList = userMatchesResponse.data?.content || userMatchesResponse.data || [];

      const userMatchesMap = {};
      userMatchesList.forEach(um => {
        if (um.match) {
          userMatchesMap[um.match.id] = um;
        }
      });
      setUserMatches(userMatchesMap);
    } catch (err) {
      console.warn('No se pudieron cargar los datos de usuario:', err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    try {
      const response = await matchService.searchByTeam(searchTerm.trim(), 0, 50);
      const results = response.data?.content || response.data || [];
      setSearchResults(results);
    } catch (err) {
      console.error('Error en busqueda:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults(null);
  };

  const getUniqueLeagues = () => {
    const leagues = [...new Set(matches.map(m => m.competition).filter(Boolean))];

    // Obtener nombres de ligas favoritas
    const favoriteLeagueNames = favoriteLeagues.map(fl => fl.leagueName);

    // Ordenar: favoritas primero, luego el resto
    return leagues.sort((a, b) => {
      const aIsFavorite = favoriteLeagueNames.includes(a);
      const bIsFavorite = favoriteLeagueNames.includes(b);

      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return 0;
    });
  };

  // Verificar si una liga es favorita
  const isLeagueFavorite = (leagueName) => {
    return favoriteLeagues.some(fl => fl.leagueName === leagueName);
  };

  const getDisplayMatches = () => {
    let filtered = searchResults !== null ? searchResults : matches;

    if (activeLeague !== 'all' && searchResults === null) {
      filtered = filtered.filter(m => m.competition === activeLeague);
    }

    return filtered;
  };

  const getLiveMatches = () => {
    return getDisplayMatches().filter(m => {
      if (!m.matchDate) return false;
      const matchDate = new Date(m.matchDate);
      const now = new Date();
      const diffHours = (now - matchDate) / (1000 * 60 * 60);
      return diffHours >= 0 && diffHours < 2 && (m.homeScore === null || m.awayScore === null);
    });
  };

  const displayMatches = getDisplayMatches();
  const liveMatches = getLiveMatches();
  const leagues = getUniqueLeagues();

  // Agrupar partidos por competición
  const getMatchesByCompetition = () => {
    const grouped = {};
    displayMatches.forEach(match => {
      const competition = match.competition || 'Otros';
      if (!grouped[competition]) {
        grouped[competition] = {
          name: competition,
          logo: match.competitionLogo,
          matches: []
        };
      }
      grouped[competition].matches.push(match);
    });

    // Ordenar: favoritas primero
    const favoriteLeagueNames = favoriteLeagues.map(fl => fl.leagueName);
    return Object.values(grouped).sort((a, b) => {
      const aIsFavorite = favoriteLeagueNames.includes(a.name);
      const bIsFavorite = favoriteLeagueNames.includes(b.name);
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return 0;
    });
  };

  const matchesByCompetition = getMatchesByCompetition();

  const toggleCompetition = (competitionName) => {
    setCollapsedCompetitions(prev => ({
      ...prev,
      [competitionName]: !prev[competitionName]
    }));
  };

  const openWatchDetailModal = (match) => {
    setWatchDetailModal({ isOpen: true, match });
  };

  const closeWatchDetailModal = () => {
    setWatchDetailModal({ isOpen: false, match: null });
  };

  const watchedCount = matches.filter(m => userMatches[m.id]?.watched).length;
  const favoritesCount = matches.filter(m => userMatches[m.id]?.favorite).length;

  if (loading) {
    return (
      <div className="home-layout">
        <aside className="sidebar">
          <div className="sidebar-skeleton"></div>
        </aside>
        <main className="main-content">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Cargando partidos...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-layout">
        <aside className="sidebar">
          <div className="sidebar-content"></div>
        </aside>
        <main className="main-content">
          <div className="error-state">
            <span className="material-symbols-outlined error-icon">error</span>
            <p>{error}</p>
            <button onClick={loadData} className="btn-retry">Reintentar</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="home-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-content">
          {/* Favorites Section */}
          <div className="sidebar-section">
            <h2 className="sidebar-section-title">Favorites</h2>
            <nav className="sidebar-nav">
              <a href="#" className="sidebar-link active">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                My Matches
                <span className="sidebar-badge">{watchedCount}</span>
              </a>
            </nav>
          </div>

          {/* Top Leagues Section */}
          <div className="sidebar-section">
            <h2 className="sidebar-section-title">Top Leagues</h2>
            <nav className="sidebar-nav">
              <a href="#" className="sidebar-link">
                <span className="material-symbols-outlined">emoji_events</span>
                Champions League
              </a>
              {leagues.slice(0, 5).map((league) => (
                <a
                  key={league}
                  href="#"
                  className={`sidebar-link ${activeLeague === league ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveLeague(activeLeague === league ? 'all' : league);
                  }}
                >
                  <span className="material-symbols-outlined" style={activeLeague === league || isLeagueFavorite(league) ? { fontVariationSettings: "'FILL' 1", color: 'var(--primary)' } : {}}>
                    {isLeagueFavorite(league) ? 'star' : 'sports_soccer'}
                  </span>
                  {league}
                  {isLeagueFavorite(league) && <span className="sidebar-badge-fav">Fav</span>}
                </a>
              ))}
            </nav>
          </div>

          {/* Categories Section */}
          <div className="sidebar-section">
            <h2 className="sidebar-section-title">Categories</h2>
            <nav className="sidebar-nav">
              <a href="#" className="sidebar-link">
                <span className="material-symbols-outlined">live_tv</span>
                Live Now
                {liveMatches.length > 0 && (
                  <span className="sidebar-badge-live">Live</span>
                )}
              </a>
              <a href="#" className="sidebar-link">
                <span className="material-symbols-outlined">calendar_month</span>
                Schedule
              </a>
            </nav>
          </div>

          {/* Premium Card */}
          <div className="premium-card">
            <p className="premium-title">Go Premium</p>
            <p className="premium-desc">Get ad-free stats & faster updates.</p>
            <button className="premium-btn">Upgrade</button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          {/* Live Matches Section */}
          <section className="matches-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="live-indicator">
                  <span className="live-dot-ping"></span>
                  <span className="live-dot"></span>
                </span>
                Today's Matches
              </h2>
              <a href="#" className="view-all-link">View All ({displayMatches.length})</a>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="search-bar">
              <span className="material-symbols-outlined search-icon">search</span>
              <input
                type="text"
                placeholder="Search matches, leagues, teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button type="button" className="search-clear" onClick={clearSearch}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </form>

            {/* Search Results Info */}
            {searchResults !== null && (
              <div className="search-results-info">
                <span>Resultados para "{searchTerm}": {searchResults.length} partidos</span>
                <button onClick={clearSearch} className="btn-clear-search">Ver todos</button>
              </div>
            )}

            {/* Matches List - Grouped by Competition */}
            {displayMatches.length === 0 ? (
              <div className="empty-state">
                <span className="material-symbols-outlined empty-icon">sports_soccer</span>
                <h3>
                  {searchResults !== null
                    ? 'No se encontraron partidos'
                    : 'No hay partidos disponibles'}
                </h3>
                <p>
                  {searchResults !== null
                    ? `No hay partidos que coincidan con "${searchTerm}"`
                    : 'No hay partidos programados'}
                </p>
              </div>
            ) : (
              <div className="competitions-list">
                {matchesByCompetition.map((competition) => (
                  <div key={competition.name} className={`competition-group ${collapsedCompetitions[competition.name] ? 'collapsed' : ''}`}>
                    <button
                      className="competition-header"
                      onClick={() => toggleCompetition(competition.name)}
                    >
                      {competition.logo ? (
                        <img src={competition.logo} alt={competition.name} className="competition-logo" />
                      ) : (
                        <span className="material-symbols-outlined competition-icon">emoji_events</span>
                      )}
                      <h3 className="competition-name">{competition.name}</h3>
                      <span className="competition-count">{competition.matches.length} partidos</span>
                      <span className={`material-symbols-outlined collapse-icon ${collapsedCompetitions[competition.name] ? 'collapsed' : ''}`}>
                        expand_more
                      </span>
                    </button>
                    {!collapsedCompetitions[competition.name] && (
                      <div className="matches-list">
                        {competition.matches.map((match) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                            userMatch={userMatches[match.id]}
                            onUpdate={loadUserMatches}
                            onOpenWatchDetail={openWatchDetailModal}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Promo Banner */}
          <div className="promo-banner">
            <div className="promo-content">
              <span className="promo-label">Mega Match Pro</span>
              <span className="promo-text">Detailed Analytics & Heatmaps Available Now</span>
            </div>
          </div>
        </div>
      </main>

      {/* Right Sidebar - Chat & Betting */}
      <aside className="right-sidebar">
        {/* Community Chat */}
        <div className="chat-panel glass-panel">
          <div className="chat-header">
            <h3 className="chat-title">
              <span className="material-symbols-outlined">forum</span>
              Community Chat
            </h3>
            <span className="chat-users">
              <span className="online-dot"></span>
              14.2K
            </span>
          </div>
          <div className="chat-messages">
            <div className="chat-message">
              <span className="chat-user primary">SportFanatic:</span>
              <span className="chat-text">Arsenal defense looks shaky today. Liverpool might snatch it late!</span>
            </div>
            <div className="chat-message">
              <span className="chat-user blue">GoalHunter:</span>
              <span className="chat-text">That red card changed everything. HT 0-0 was fair for Chelsea.</span>
            </div>
            <div className="chat-message">
              <span className="chat-user purple">MatchPredictor:</span>
              <span className="chat-text">Just placed a bet on Gunners to win. Odds are too good to miss!</span>
            </div>
            <div className="chat-message">
              <span className="chat-user yellow">UltraRed:</span>
              <span className="chat-text">Klopp's subs will make the difference in the 2nd half.</span>
            </div>
            <div className="chat-message system-message">
              <span className="chat-user primary">MegaBot:</span>
              <span className="chat-text">Please follow community guidelines. No spamming odds.</span>
            </div>
            <div className="chat-message">
              <span className="chat-user pink">SoccerQueen:</span>
              <span className="chat-text">Anyone watching the Dortmund game? Absolute clinic by Bayern.</span>
            </div>
          </div>
          <div className="chat-input-wrapper">
            <input type="text" placeholder="Send a message..." className="chat-input" />
            <button className="chat-send-btn">
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>

        {/* Betting Trends */}
        <div className="betting-panel glass-panel">
          <div className="betting-header">
            <h3 className="betting-title">
              <span className="material-symbols-outlined">trending_up</span>
              Betting Trends
            </h3>
            <span className="betting-badge">Live Odds</span>
          </div>
          <div className="betting-content">
            <p className="betting-match-label">Match Odds: Featured Game</p>
            <div className="odds-grid">
              <button className="odds-btn active">
                <span className="odds-label">1</span>
                <span className="odds-value">1.35</span>
              </button>
              <button className="odds-btn">
                <span className="odds-label">X</span>
                <span className="odds-value">4.50</span>
              </button>
              <button className="odds-btn">
                <span className="odds-label">2</span>
                <span className="odds-value">8.00</span>
              </button>
            </div>
            <div className="trend-section">
              <p className="trend-label">Community Trend</p>
              <div className="trend-bar">
                <div className="trend-segment primary" style={{ width: '65%' }}></div>
                <div className="trend-segment gray" style={{ width: '20%' }}></div>
                <div className="trend-segment blue" style={{ width: '15%' }}></div>
              </div>
              <div className="trend-labels">
                <span>65% Home</span>
                <span>20% Draw</span>
                <span>15% Away</span>
              </div>
            </div>
          </div>
        </div>

        {/* Promo Card */}
        <div className="sidebar-promo">
          <div className="sidebar-promo-overlay"></div>
          <div className="sidebar-promo-content">
            <p className="sidebar-promo-label">Promoted</p>
            <p className="sidebar-promo-title">Elevate Your Game</p>
            <p className="sidebar-promo-desc">Shop Latest Kits</p>
          </div>
        </div>
      </aside>

      {/* Watch Detail Modal */}
      <WatchDetailModal
        match={watchDetailModal.match}
        userMatch={watchDetailModal.match ? userMatches[watchDetailModal.match.id] : null}
        isOpen={watchDetailModal.isOpen}
        onClose={closeWatchDetailModal}
        onUpdate={loadUserMatches}
      />
    </div>
  );
}

export default Home;
