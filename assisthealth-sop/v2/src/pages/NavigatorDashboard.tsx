import React, { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import TopNavbar from '../components/layout/TopNavbar';
import { db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { Chapter } from '../components/tables/ChaptersTable';
import { useAuth } from '../context/AuthContext';


const NavigatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [quizResults, setQuizResults] = useState<Record<string, { passed: boolean, score: number, total: number }>>({});

  useEffect(() => {
    const fetchChaptersAndResults = async () => {
      const snap = await getDocs(collection(db, 'chapters'));
      setChapters(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chapter)).sort((a, b) => a.order - b.order));
      
      if (user) {
        const resSnap = await getDocs(query(collection(db, 'quizResults'), where('userId', '==', user.uid)));
        const resultsMap: Record<string, { passed: boolean, score: number, total: number }> = {};
        resSnap.forEach(doc => {
          const data = doc.data();
          resultsMap[data.chapterId] = { passed: data.passed, score: data.score, total: data.total };
        });
        setQuizResults(resultsMap);
      }
    };
    fetchChaptersAndResults();
  }, [user]);

  const passedCount = Object.values(quizResults).filter(r => r.passed).length;

  return (
    <div className="dashboard-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        <TopNavbar title="Navigator Portal" />

        <div className="page-content">
          {activeTab === 'dashboard' && (
            <div className="fade-in">
              <div className="page-header">
                <h1>Welcome, Navigator</h1>
                <p>Access your training materials and track your progress.</p>
              </div>

              <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="summary-card" onClick={() => setActiveTab('sop')}>
                  <div className="summary-card-icon nav-chapters">
                    <i className="fas fa-book-open"></i>
                  </div>
                  <div className="summary-card-info">
                    <h3>Available Chapters</h3>
                    <div className="summary-card-count">{chapters.length}</div>
                  </div>
                </div>

                <div className="summary-card" onClick={() => setActiveTab('sop')}>
                  <div className="summary-card-icon navigators">
                    <i className="fas fa-graduation-cap"></i>
                  </div>
                  <div className="summary-card-info">
                    <h3>Training Progress</h3>
                    <div className="summary-card-count" style={{ fontSize: '16px', fontWeight: 500 }}>
                      Completed {passedCount} of {chapters.length} Chapters
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sop' && (
            <div className="fade-in">
              <div className="page-header">
                <h1>SOP Chapters</h1>
                <p>Complete each chapter and take the quiz to certify.</p>
              </div>

              <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                {chapters.map(chapter => (
                  <div key={chapter.id} className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '14px', fontWeight: 700 }}>{chapter.order}</span>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{chapter.title}</h3>
                      {quizResults[chapter.id] && (
                        <span className={`badge ${quizResults[chapter.id].passed ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: 'auto', fontSize: '12px' }}>
                          {quizResults[chapter.id].passed ? 'Passed' : 'Failed'} ({Math.round((quizResults[chapter.id].score / quizResults[chapter.id].total) * 100)}%)
                        </span>
                      )}
                    </div>
                    {chapter.content && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px', lineHeight: 1.5 }}>
                        {chapter.content.substring(0, 120)}...
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {chapter.pdfUrl && (
                        <a href={chapter.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                          <i className="fas fa-file-pdf"></i> Read PDF
                        </a>
                      )}
                      {chapter.youtubeUrl && (
                        <a href={chapter.youtubeUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                          <i className="fab fa-youtube"></i> Watch Video
                        </a>
                      )}
                      <button
                        className={`btn btn-sm ${quizResults[chapter.id]?.passed ? 'btn-outline' : 'btn-primary'}`}
                        onClick={() => window.location.href = `/quiz/${chapter.id}`}
                      >
                        <i className={quizResults[chapter.id]?.passed ? "fas fa-redo" : "fas fa-clipboard-check"}></i> 
                        {quizResults[chapter.id]?.passed ? ' Retake Quiz' : ' Take Quiz'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default NavigatorDashboard;
