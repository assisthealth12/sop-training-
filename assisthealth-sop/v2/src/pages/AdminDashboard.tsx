import React, { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import TopNavbar from '../components/layout/TopNavbar';
import SummaryCards from '../components/dashboard/SummaryCards';
import UsersTable from '../components/tables/UsersTable';
import type { User } from '../components/tables/UsersTable';
import ChaptersTable from '../components/tables/ChaptersTable';
import type { Chapter } from '../components/tables/ChaptersTable';
import AddUserModal from '../components/modals/AddUserModal';
import AddChapterModal from '../components/modals/AddChapterModal';
import ManageQuizModal from '../components/modals/ManageQuizModal';
import { useConfirm } from '../components/ui/ToastConfirm';
import { db } from '../config/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, getDoc } from 'firebase/firestore';

const AdminDashboard: React.FC = () => {
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userSubTab, setUserSubTab] = useState<'navigators' | 'coordinators'>('navigators');
  const [chapterSubTab, setChapterSubTab] = useState<'navChapters' | 'coordChapters'>('navChapters');

  // Data
  const [navigators, setNavigators] = useState<User[]>([]);
  const [coordinators, setCoordinators] = useState<User[]>([]);
  const [navChapters, setNavChapters] = useState<Chapter[]>([]);
  const [coordChapters, setCoordChapters] = useState<Chapter[]>([]);
  const [navSopVersion, setNavSopVersion] = useState(0);
  const [coordSopVersion, setCoordSopVersion] = useState(0);

  // Modals
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddChapterModalOpen, setIsAddChapterModalOpen] = useState(false);
  const [isManageQuizModalOpen, setIsManageQuizModalOpen] = useState(false);
  const [quizChapterId, setQuizChapterId] = useState('');
  const [quizChapterTitle, setQuizChapterTitle] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const navQuery = query(collection(db, 'users'), where('role', '==', 'navigator'));
      const navSnap = await getDocs(navQuery);
      setNavigators(navSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)));

      const coordQuery = query(collection(db, 'users'), where('role', '==', 'coordinator'));
      const coordSnap = await getDocs(coordQuery);
      setCoordinators(coordSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)));

      const navChSnap = await getDocs(collection(db, 'chapters'));
      setNavChapters(navChSnap.docs.map(d => ({ id: d.id, ...d.data() } as Chapter)).sort((a, b) => a.order - b.order));

      const coordChSnap = await getDocs(collection(db, 'coordinatorChapters'));
      setCoordChapters(coordChSnap.docs.map(d => ({ id: d.id, ...d.data() } as Chapter)).sort((a, b) => a.order - b.order));

      const navSettings = await getDoc(doc(db, 'settings', 'sop'));
      if (navSettings.exists()) setNavSopVersion(navSettings.data().currentSopVersion || 0);

      const coordSettings = await getDoc(doc(db, 'settings', 'coordinatorSop'));
      if (coordSettings.exists()) setCoordSopVersion(coordSettings.data().currentSopVersion || 0);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // Navigate from SummaryCards
  const handleCardNavigate = (tab: string, subTab?: string) => {
    setActiveTab(tab);
    if (tab === 'users' && subTab) setUserSubTab(subTab as 'navigators' | 'coordinators');
    if (tab === 'chapters' && subTab) setChapterSubTab(subTab as 'navChapters' | 'coordChapters');
  };

  // --- CRUD Handlers ---
  const handleSaveUser = async (user: Partial<User>) => {
    const role = userSubTab === 'navigators' ? 'navigator' : 'coordinator';
    const id = editingUser ? editingUser.id : user.email!.replace(/[@.]/g, '_');
    await setDoc(doc(db, 'users', id), { ...user, role }, { merge: true });
    if (user.email) await setDoc(doc(db, 'preapprovedEmails', user.email), { role });
    fetchData();
  };

  const handleDeleteUser = async (id: string, email?: string) => {
    const ok = await confirm({ title: 'Delete User', message: 'Are you sure you want to delete this user? This action cannot be undone.', confirmText: 'Delete', variant: 'danger' });
    if (ok) {
      await deleteDoc(doc(db, 'users', id));
      if (email) await deleteDoc(doc(db, 'preapprovedEmails', email));
      fetchData();
    }
  };

  const handleSaveChapter = async (chapter: Omit<Chapter, 'id'>) => {
    const collectionName = chapterSubTab === 'navChapters' ? 'chapters' : 'coordinatorChapters';
    const id = editingChapter ? editingChapter.id : String(chapter.order);
    const payload = editingChapter ? chapter : { ...chapter, version: 1 };
    await setDoc(doc(db, collectionName, id), payload, { merge: true });
    fetchData();
  };

  const handleDeleteChapter = async (id: string) => {
    const collectionName = chapterSubTab === 'navChapters' ? 'chapters' : 'coordinatorChapters';
    const ok = await confirm({ title: 'Delete Chapter', message: 'Are you sure you want to delete this chapter and all its questions?', confirmText: 'Delete', variant: 'danger' });
    if (ok) {
      await deleteDoc(doc(db, collectionName, id));
      fetchData();
    }
  };

  const handleIncrementChapterVersion = async (id: string) => {
    const ok = await confirm({ title: 'Increment Version', message: 'This will force all users to retake this chapter. Continue?', confirmText: 'Increment', variant: 'warning' });
    if (ok) {
      const collectionName = chapterSubTab === 'navChapters' ? 'chapters' : 'coordinatorChapters';
      const chapterDoc = await getDoc(doc(db, collectionName, id));
      if (chapterDoc.exists()) {
        const currentVersion = chapterDoc.data().version || 1;
        await setDoc(doc(db, collectionName, id), { version: currentVersion + 1 }, { merge: true });
        fetchData();
      }
    }
  };

  const handleIncrementSopVersion = async (role: 'navigator' | 'coordinator') => {
    const ok = await confirm({ title: 'Increment SOP Version', message: `This will flag all ${role}s as "Needs Retake". Continue?`, confirmText: 'Increment', variant: 'warning' });
    if (ok) {
      if (role === 'navigator') {
        await setDoc(doc(db, 'settings', 'sop'), { currentSopVersion: navSopVersion + 1 }, { merge: true });
      } else {
        await setDoc(doc(db, 'settings', 'coordinatorSop'), { currentSopVersion: coordSopVersion + 1 }, { merge: true });
      }
      fetchData();
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content">
        <TopNavbar title="Admin Dashboard" hideSearch />

        <div className="page-content">
          {/* ======== DASHBOARD TAB ======== */}
          {activeTab === 'dashboard' && (
            <div className="fade-in">
              <div className="page-header">
                <h1>Dashboard Overview</h1>
                <p>Here's what's happening with your SOP portals today.</p>
              </div>
              <SummaryCards
                navigatorCount={navigators.length}
                coordinatorCount={coordinators.length}
                navChapterCount={navChapters.length}
                coordChapterCount={coordChapters.length}
                onNavigate={handleCardNavigate}
              />
            </div>
          )}

          {/* ======== USERS TAB ======== */}
          {activeTab === 'users' && (
            <div className="fade-in">
              <div className="page-header">
                <h1>User Management</h1>
                <p>Manage navigators and community coordinators.</p>
              </div>

              <div className="tab-bar">
                <button className={`tab-item ${userSubTab === 'navigators' ? 'active' : ''}`} onClick={() => setUserSubTab('navigators')}>
                  <i className="fas fa-user-nurse"></i> Navigators
                </button>
                <button className={`tab-item ${userSubTab === 'coordinators' ? 'active' : ''}`} onClick={() => setUserSubTab('coordinators')}>
                  <i className="fas fa-users-cog"></i> Coordinators
                </button>
              </div>

              {userSubTab === 'navigators' && (
                <UsersTable
                  title="Navigators"
                  users={navigators}
                  allChapters={navChapters}
                  currentSopVersion={navSopVersion}
                  onAdd={() => { setEditingUser(null); setIsAddUserModalOpen(true); }}
                  onEdit={(u) => { setEditingUser(u as User); setIsAddUserModalOpen(true); }}
                  onDelete={(id) => handleDeleteUser(id, navigators.find(n => n.id === id)?.email)}
                />
              )}

              {userSubTab === 'coordinators' && (
                <UsersTable
                  title="Community Coordinators"
                  users={coordinators}
                  allChapters={coordChapters}
                  currentSopVersion={coordSopVersion}
                  onAdd={() => { setEditingUser(null); setIsAddUserModalOpen(true); }}
                  onEdit={(u) => { setEditingUser(u as User); setIsAddUserModalOpen(true); }}
                  onDelete={(id) => handleDeleteUser(id, coordinators.find(c => c.id === id)?.email)}
                />
              )}
            </div>
          )}

          {/* ======== CHAPTERS TAB ======== */}
          {activeTab === 'chapters' && (
            <div className="fade-in">
              <div className="page-header">
                <h1>SOP Chapters</h1>
                <p>Manage training chapters and their versions.</p>
              </div>

              <div className="tab-bar">
                <button className={`tab-item ${chapterSubTab === 'navChapters' ? 'active' : ''}`} onClick={() => setChapterSubTab('navChapters')}>
                  <i className="fas fa-book-medical"></i> Navigator Chapters
                </button>
                <button className={`tab-item ${chapterSubTab === 'coordChapters' ? 'active' : ''}`} onClick={() => setChapterSubTab('coordChapters')}>
                  <i className="fas fa-book"></i> Coordinator Chapters
                </button>
              </div>

              {chapterSubTab === 'navChapters' && (
                <ChaptersTable
                  title="Navigator Chapters"
                  chapters={navChapters}
                  onAdd={() => { setEditingChapter(null); setIsAddChapterModalOpen(true); }}
                  onEdit={(c) => { setEditingChapter(c); setIsAddChapterModalOpen(true); }}
                  onDelete={handleDeleteChapter}
                  onViewQuiz={(id) => {
                    const ch = navChapters.find(c => c.id === id);
                    if (ch) {
                      setQuizChapterId(ch.id);
                      setQuizChapterTitle(ch.title);
                      setIsManageQuizModalOpen(true);
                    }
                  }}
                  onIncrementVersion={handleIncrementChapterVersion}
                />
              )}

              {chapterSubTab === 'coordChapters' && (
                <ChaptersTable
                  title="Coordinator Chapters"
                  chapters={coordChapters}
                  onAdd={() => { setEditingChapter(null); setIsAddChapterModalOpen(true); }}
                  onEdit={(c) => { setEditingChapter(c); setIsAddChapterModalOpen(true); }}
                  onDelete={handleDeleteChapter}
                  onViewQuiz={(id) => {
                    const ch = coordChapters.find(c => c.id === id);
                    if (ch) {
                      setQuizChapterId(ch.id);
                      setQuizChapterTitle(ch.title);
                      setIsManageQuizModalOpen(true);
                    }
                  }}
                  onIncrementVersion={handleIncrementChapterVersion}
                />
              )}
            </div>
          )}

          {/* ======== SETTINGS TAB ======== */}
          {activeTab === 'settings' && (
            <div className="fade-in">
              <div className="page-header">
                <h1>Settings</h1>
                <p>Manage global SOP version configurations.</p>
              </div>

              <div className="settings-card" style={{ maxWidth: '800px', padding: '40px', background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="settings-card-header" style={{ marginBottom: '40px', textAlign: 'center' }}>
                  <div style={{ 
                    width: '64px', height: '64px', background: 'var(--bg-body)', borderRadius: '16px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    margin: '0 auto 20px', fontSize: '24px', color: 'var(--primary)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                  }}>
                    <i className="fas fa-layer-group"></i>
                  </div>
                  <h2 style={{ fontSize: '24px', color: 'var(--primary)', fontWeight: 700, marginBottom: '8px' }}>SOP Version Control</h2>
                  <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.5 }}>
                    Incrementing a version will require all users of that role to retake their assessment.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                  {/* Navigator Card */}
                  <div style={{ 
                    background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: '16px', 
                    padding: '28px', display: 'flex', flexDirection: 'column',
                    transition: 'var(--transition)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Navigator SOP</h3>
                      <span style={{ background: 'var(--primary)', color: 'white', padding: '6px 12px', borderRadius: '50px', fontSize: '13px', fontWeight: 600 }}>
                        v{navSopVersion}
                      </span>
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px', flex: 1, lineHeight: 1.6 }}>
                      Flags all navigators as "Needs Retake". Use this when major changes are published to the navigator SOP content.
                    </p>
                    <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={() => handleIncrementSopVersion('navigator')}>
                      <i className="fas fa-arrow-up"></i> Increment Version
                    </button>
                  </div>

                  {/* Coordinator Card */}
                  <div style={{ 
                    background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: '16px', 
                    padding: '28px', display: 'flex', flexDirection: 'column',
                    transition: 'var(--transition)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Coordinator SOP</h3>
                      <span style={{ background: 'var(--primary)', color: 'white', padding: '6px 12px', borderRadius: '50px', fontSize: '13px', fontWeight: 600 }}>
                        v{coordSopVersion}
                      </span>
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px', flex: 1, lineHeight: 1.6 }}>
                      Flags all coordinators as "Needs Retake". Use this when major changes are published to the coordinator SOP content.
                    </p>
                    <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={() => handleIncrementSopVersion('coordinator')}>
                      <i className="fas fa-arrow-up"></i> Increment Version
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSubmit={handleSaveUser}
        title={`Add New ${userSubTab === 'coordinators' ? 'Coordinator' : 'Navigator'}`}
        initialData={editingUser}
      />

      <AddChapterModal
        isOpen={isAddChapterModalOpen}
        onClose={() => setIsAddChapterModalOpen(false)}
        onSubmit={handleSaveChapter}
        title={`Add New ${chapterSubTab === 'coordChapters' ? 'Coordinator' : 'Navigator'} Chapter`}
        initialData={editingChapter}
      />

      <ManageQuizModal
        isOpen={isManageQuizModalOpen}
        onClose={() => setIsManageQuizModalOpen(false)}
        chapterId={quizChapterId}
        chapterTitle={quizChapterTitle}
        collectionName={chapterSubTab === 'coordChapters' ? 'coordinatorChapters' : 'chapters'}
      />
    </div>
  );
};

export default AdminDashboard;
