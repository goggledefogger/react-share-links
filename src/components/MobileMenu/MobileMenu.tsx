import React from 'react';
import { Link } from 'react-router-dom';
import { FaMoon, FaSun } from 'react-icons/fa';
import './MobileMenu.css';

interface MobileMenuProps {
  isOpen: boolean;
  user: any; // Replace 'any' with your actual user type
  profile: any; // Replace 'any' with your actual profile type
  signOutUser: () => void;
  theme: string;
  toggleTheme: () => void;
  onClose: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  user,
  profile,
  signOutUser,
  theme,
  toggleTheme,
  onClose,
}) => {
  const handleLinkClick = () => {
    onClose();
  };

  const handleSignOut = () => {
    signOutUser();
    onClose();
  };

  return (
    <div className={`mobile-menu ${isOpen ? 'open' : ''}`}>
      <nav className="main-nav">
        {user && (
          <Link to="/" className="nav-link" onClick={handleLinkClick}>
            Channels
          </Link>
        )}
      </nav>
      <div className="user-actions">
        {user ? (
          <>
            <Link to="/profile" className="welcome-message" onClick={handleLinkClick}>
              Welcome, {profile?.username || user.email}
            </Link>
            <button onClick={handleSignOut} className="btn btn-primary">
              Sign Out
            </button>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary" onClick={handleLinkClick}>
            Sign In
          </Link>
        )}
        <button
          onClick={toggleTheme}
          className="btn btn-icon"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}>
          {theme === 'light' ? <FaMoon /> : <FaSun />}
        </button>
      </div>
    </div>
  );
};

export default MobileMenu;
