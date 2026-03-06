import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import authService from '../services/authService';
import './Navbar.css';

function Navbar() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const user = authService.getUser();
  const isAuthenticated = authService.isAuthenticated();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-brand">
          <Link to="/" className="navbar-logo">
            <span className="material-symbols-outlined logo-icon">sports_soccer</span>
            <h1 className="logo-text">Mega Match</h1>
          </Link>
        </div>

        {/* Search Bar - Center */}
        <div className="navbar-search">
          <div className="search-wrapper">
            <span className="material-symbols-outlined search-icon">search</span>
            <input
              type="text"
              placeholder="Search matches, leagues, teams..."
              className="search-input"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="navbar-actions">
          {/* Language Button */}
          <button className="action-btn">
            <span className="material-symbols-outlined">language</span>
            <span className="action-label">EN</span>
          </button>

          {/* Theme Toggle */}
          <button
            className="action-btn icon-only"
            onClick={toggleTheme}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            <span className="material-symbols-outlined">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Notifications */}
          {isAuthenticated && (
            <button className="action-btn icon-only notification-btn">
              <span className="material-symbols-outlined">notifications</span>
              <span className="notification-dot"></span>
            </button>
          )}

          {/* User Menu */}
          {isAuthenticated ? (
            <div className="user-menu">
              <Link to="/profile" className="user-avatar">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </Link>
              <div className="user-dropdown">
                <Link to="/profile" className="dropdown-item">
                  <span className="material-symbols-outlined">person</span>
                  Mi Perfil
                </Link>
                {authService.isAdmin() && (
                  <Link to="/admin" className="dropdown-item">
                    <span className="material-symbols-outlined">admin_panel_settings</span>
                    Admin
                  </Link>
                )}
                <button onClick={handleLogout} className="dropdown-item logout">
                  <span className="material-symbols-outlined">logout</span>
                  Salir
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="auth-link">Iniciar Sesion</Link>
              <Link to="/register" className="auth-btn">Registrarse</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
