import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface TopNavbarProps {
  title?: string;
  hideSearch?: boolean;
}

const TopNavbar: React.FC<TopNavbarProps> = ({ title, hideSearch }) => {
  const { user, role } = useAuth();
  
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <header className="topbar">
      <h1 className="topbar-title">{title || 'Dashboard'}</h1>

      <div className="topbar-actions">
        {!hideSearch && (
          <div className="topbar-search">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Search..." />
          </div>
        )}

        <div className="topbar-user">
          <div className="topbar-avatar">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="topbar-user-info">
            <span className="topbar-user-name">{displayName}</span>
            <span className="topbar-user-role">{role || 'Admin'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
