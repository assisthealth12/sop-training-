import React, { useState } from 'react';

export interface HiringResult {
  id: string;
  name: string;
  email: string;
  phone: string;
  score: number;
  totalQuestions: number;
  timestamp: string; // ISO string
}

interface HiringResultsTableProps {
  results: HiringResult[];
}

const HiringResultsTable: React.FC<HiringResultsTableProps> = ({ results }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredResults = results.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.phone.includes(searchTerm)
  );

  return (
    <div className="table-card">
      <div className="table-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0 }}>Candidate Results</h2>
          <span className="badge badge-neutral">{filteredResults.length} records</span>
        </div>
        <div className="table-actions">
          <div className="search-input">
            <i className="fas fa-search"></i>
            <input 
              type="text" 
              placeholder="Search by name, email or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact Info</th>
              <th>Score</th>
              <th>Date Taken</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <i className="fas fa-inbox" style={{ fontSize: '32px', marginBottom: '12px', display: 'block', color: 'var(--border)' }}></i>
                  No results found.
                </td>
              </tr>
            ) : (
              filteredResults.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(r => {
                const percentage = Math.round((r.score / r.totalQuestions) * 100);
                const scoreVariant = percentage >= 80 ? 'success' : percentage >= 50 ? 'warning' : 'danger';
                
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-info">
                          <div className="user-name">{r.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <i className="fas fa-envelope" style={{ width: '16px', color: 'var(--text-muted)' }}></i> {r.email}
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <i className="fas fa-phone" style={{ width: '16px', color: 'var(--text-muted)' }}></i> {r.phone}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className={`progress-bar-container`} style={{ flex: 1, height: '6px', maxWidth: '100px', background: 'var(--bg-body)', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${percentage}%`, 
                            background: `var(--${scoreVariant})`,
                            borderRadius: '10px'
                          }}></div>
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: `var(--${scoreVariant})` }}>
                          {percentage}% ({r.score}/{r.totalQuestions})
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {new Date(r.timestamp).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HiringResultsTable;
