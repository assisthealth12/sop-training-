import React, { useState } from 'react';

export interface Chapter {
  id: string;
  order: number;
  title: string;
  content?: string;
  pdfUrl?: string;
  youtubeUrl?: string;
  timestamp?: string;
  version?: number;
}

interface ChaptersTableProps {
  title: string;
  chapters: Chapter[];
  onAdd: () => void;
  onEdit: (chapter: Chapter) => void;
  onDelete: (id: string) => void;
  onViewQuiz: (id: string) => void;
  onIncrementVersion?: (id: string) => void;
}

const ChaptersTable: React.FC<ChaptersTableProps> = ({ title, chapters, onAdd, onEdit, onDelete, onViewQuiz, onIncrementVersion }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChapters = chapters.filter(chapter =>
    (chapter.title || '').toLowerCase().includes(searchTerm.toLowerCase())
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
              placeholder="Search chapters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={onAdd}>
            <i className="fas fa-plus"></i> Add Chapter
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ width: 60 }}>#</th>
              <th>Chapter Title</th>
              <th style={{ width: 90 }}>Version</th>
              <th style={{ width: 100 }}>Resources</th>
              <th style={{ width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredChapters.length > 0 ? (
              filteredChapters.map((chapter) => (
                <tr key={chapter.id}>
                  <td>
                    <span className="badge badge-neutral">{chapter.order}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{chapter.title || 'Untitled'}</div>
                    {chapter.content && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                        {chapter.content.substring(0, 60)}...
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-info">v{chapter.version || 1}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {chapter.pdfUrl && (
                        <span className="badge badge-danger" title="Has PDF">
                          <i className="fas fa-file-pdf"></i>
                        </span>
                      )}
                      {chapter.youtubeUrl && (
                        <span className="badge badge-danger" title="Has Video">
                          <i className="fab fa-youtube"></i>
                        </span>
                      )}
                      {!chapter.pdfUrl && !chapter.youtubeUrl && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {onIncrementVersion && (
                        <button className="icon-btn info" title="Increment Version" onClick={() => onIncrementVersion(chapter.id)}>
                          <i className="fas fa-arrow-up"></i>
                        </button>
                      )}
                      <button className="icon-btn" title="Manage Quiz" onClick={() => onViewQuiz(chapter.id)}>
                        <i className="fas fa-clipboard-list"></i>
                      </button>
                      <button className="icon-btn" title="Edit" onClick={() => onEdit(chapter)}>
                        <i className="fas fa-pen"></i>
                      </button>
                      <button className="icon-btn danger" title="Delete" onClick={() => onDelete(chapter.id)}>
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    <i className="fas fa-book-open"></i>
                    <p>No chapters found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChaptersTable;
