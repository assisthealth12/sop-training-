import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { Chapter } from '../tables/ChaptersTable';
import type { User } from '../tables/UsersTable';

interface ViewUserResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  chapters: Chapter[];
}

interface QuizResult {
  chapterId: string;
  score: number;
  total: number;
  passed: boolean;
  passingPercentage: number;
  submittedAt: any;
}

const ViewUserResultsModal: React.FC<ViewUserResultsModalProps> = ({ isOpen, onClose, user, chapters }) => {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchResults();
    }
  }, [isOpen, user]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'quizResults'), where('userId', '==', user!.id));
      const snap = await getDocs(q);
      const resData = snap.docs.map(d => d.data() as QuizResult);
      setResults(resData.sort((a, b) => b.submittedAt?.toDate() - a.submittedAt?.toDate()));
    } catch (error) {
      console.error("Error fetching results:", error);
    }
    setLoading(false);
  };

  if (!isOpen || !user) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', width: '100%' }}>
        <div className="modal-header">
          <h2>Quiz Results for {user.name}</h2>
          <button className="modal-close" onClick={onClose}><i className="fas fa-times"></i></button>
        </div>
        
        <div className="modal-body">
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading results...</div>
          ) : results.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <i className="fas fa-clipboard-check" style={{ fontSize: '32px', color: 'var(--border)' }}></i>
              <p style={{ marginTop: '12px' }}>This user hasn't taken any quizzes yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {results.map((res, idx) => {
                const chapterInfo = chapters.find(c => c.id === res.chapterId);
                const title = chapterInfo ? chapterInfo.title : `Chapter ID: ${res.chapterId}`;
                const percent = res.total > 0 ? Math.round((res.score / res.total) * 100) : 0;
                
                return (
                  <div key={idx} style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px', background: 'var(--bg-card)', 
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{title}</h4>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {res.submittedAt?.toDate().toLocaleDateString() || 'Unknown Date'}
                        &nbsp; • &nbsp; Score: {res.score} / {res.total}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: res.passed ? 'var(--success)' : 'var(--danger)' }}>
                        {percent}%
                      </div>
                      <span className={`badge ${res.passed ? 'badge-success' : 'badge-danger'}`}>
                        {res.passed ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewUserResultsModal;
