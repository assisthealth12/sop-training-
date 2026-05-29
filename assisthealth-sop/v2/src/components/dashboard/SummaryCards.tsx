import React from 'react';

interface SummaryCardsProps {
  navigatorCount: number;
  coordinatorCount: number;
  navChapterCount: number;
  coordChapterCount: number;
  onNavigate: (tab: string, subTab?: string) => void;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({
  navigatorCount,
  coordinatorCount,
  navChapterCount,
  coordChapterCount,
  onNavigate
}) => {
  const cards = [
    {
      label: 'Total Navigators',
      count: navigatorCount,
      icon: 'fas fa-user-nurse',
      colorClass: 'navigators',
      onClick: () => onNavigate('users', 'navigators'),
    },
    {
      label: 'Total Coordinators',
      count: coordinatorCount,
      icon: 'fas fa-users-cog',
      colorClass: 'coordinators',
      onClick: () => onNavigate('users', 'coordinators'),
    },
    {
      label: 'Navigator Chapters',
      count: navChapterCount,
      icon: 'fas fa-book-medical',
      colorClass: 'nav-chapters',
      onClick: () => onNavigate('chapters', 'navChapters'),
    },
    {
      label: 'Coordinator Chapters',
      count: coordChapterCount,
      icon: 'fas fa-book',
      colorClass: 'coord-chapters',
      onClick: () => onNavigate('chapters', 'coordChapters'),
    },
  ];

  return (
    <div className="summary-grid">
      {cards.map(card => (
        <div key={card.label} className="summary-card" onClick={card.onClick}>
          <div className={`summary-card-icon ${card.colorClass}`}>
            <i className={card.icon}></i>
          </div>
          <div className="summary-card-info">
            <h3>{card.label}</h3>
            <div className="summary-card-count">{card.count}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
