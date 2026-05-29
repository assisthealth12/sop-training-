import React, { useState } from 'react';
import type { Chapter } from './ChaptersTable';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'navigator' | 'coordinator';
  status?: string;
  deadline?: any;
  completedChapters?: number[];
  chapterVersionsCompleted?: Record<string, number>;
  sopVersionCompleted?: number;
}

interface UsersTableProps {
  title: string;
  users: User[];
  allChapters?: Chapter[];
  currentSopVersion?: number;
  onAdd: () => void;
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
}

const UsersTable: React.FC<UsersTableProps> = ({ title, users, allChapters = [], currentSopVersion = 0, onAdd, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user =>
    (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card">
      <div className="card-header">
        <h2>{title}</h2>
        <div className="card-header-actions">
          <div className="search-input">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={onAdd}>
            <i className="fas fa-plus"></i> Add New
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Retakes</th>
              <th>SOP Status</th>
              <th>Deadline</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <i className="fas fa-users"></i>
                    <p>No users found</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => {
                // Deadline
                let deadlineText = '—';
                let deadlineClass = '';
                if (user.deadline) {
                  const deadlineDate = user.deadline.toDate ? user.deadline.toDate() : new Date(user.deadline);
                  deadlineText = deadlineDate.toLocaleDateString();
                  const daysDiff = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 3600 * 24));
                  if (daysDiff < 0) deadlineClass = 'badge-danger';
                  else if (daysDiff <= 3) deadlineClass = 'badge-warning';
                }

                // Progress
                const totalChapters = allChapters.length;
                const completedCount = user.completedChapters?.length || 0;
                const progressPercent = totalChapters > 0 ? (completedCount / totalChapters) * 100 : 0;

                // Retakes
                let needsRetakeCount = 0;
                if (user.completedChapters) {
                  allChapters.forEach(chapter => {
                    const userChapterVer = user.chapterVersionsCompleted?.[chapter.id] || 0;
                    if (userChapterVer < (chapter.version || 1) && user.completedChapters!.includes(parseInt(chapter.id))) {
                      needsRetakeCount++;
                    }
                  });
                }

                // SOP Status
                const needsSopRetake = (user.sopVersionCompleted || 0) < currentSopVersion;

                return (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 500 }}>{user.name || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                    <td>
                      <span className={`badge ${user.status === 'Inactive' || user.status === 'Suspended' ? 'badge-danger' : 'badge-success'}`}>
                        {user.status || 'Active'}
                      </span>
                    </td>
                    <td>
                      <div className="progress-bar-container">
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${progressPercent}%`,
                              background: progressPercent === 100 ? 'var(--success)' : 'var(--primary)',
                            }}
                          />
                        </div>
                        <span className="progress-label">{completedCount}/{totalChapters}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${needsRetakeCount > 0 ? 'badge-warning' : 'badge-success'}`}>
                        {needsRetakeCount > 0 ? `${needsRetakeCount} needed` : 'None'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${needsSopRetake ? 'badge-warning' : 'badge-success'}`}>
                        {needsSopRetake ? 'Needs Retake' : 'Up to Date'}
                      </span>
                    </td>
                    <td>
                      {deadlineClass ? (
                        <span className={`badge ${deadlineClass}`}>{deadlineText}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>{deadlineText}</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="icon-btn" title="Edit" onClick={() => onEdit(user)}>
                          <i className="fas fa-pen"></i>
                        </button>
                        <button className="icon-btn danger" title="Delete" onClick={() => onDelete(user.id)}>
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
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

export default UsersTable;
