import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../config/firebase';
import { signOut } from 'firebase/auth';

import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const adminLinks = [
    { id: 'dashboard', icon: 'fas fa-th-large', label: 'Dashboard' },
    { id: 'users', icon: 'fas fa-users', label: 'User Management' },
    { id: 'chapters', icon: 'fas fa-book-open', label: 'SOP Chapters' },
    { id: 'hiring', icon: 'fas fa-user-plus', label: 'Hiring Test' },
    { id: 'settings', icon: 'fas fa-sliders-h', label: 'Settings' },
  ];

  const userLinks = [
    { id: 'dashboard', icon: 'fas fa-th-large', label: 'Dashboard' },
    { id: 'sop', icon: 'fas fa-book-open', label: 'SOP Chapters' },
  ];

  const links = role === 'admin' ? adminLinks : userLinks;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <img src="/assets/images/AH1.png" alt="AssistHealth" className="logo" />
        </div>
      </div>

      <ul className="sidebar-menu">
        {links.map(link => (
          <li key={link.id}>
            <a
              href="#"
              className={activeTab === link.id ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); setActiveTab(link.id); }}
            >
              <i className={link.icon}></i>
              <span>{link.label}</span>
            </a>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }} className="logout-btn">
          <i className="fas fa-sign-out-alt"></i>
          <span>Logout</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
