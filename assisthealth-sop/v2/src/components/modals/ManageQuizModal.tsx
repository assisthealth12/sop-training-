import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, getDoc, updateDoc } from 'firebase/firestore';
import { useToast, useConfirm } from '../ui/ToastConfirm';

interface ManageQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  chapterTitle: string;
  collectionName: 'chapters' | 'coordinatorChapters' | 'hiring';
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  section?: string;
}

type ActiveTab = 'questions' | 'settings';

const ManageQuizModal: React.FC<ManageQuizModalProps> = ({ isOpen, onClose, chapterId, chapterTitle, collectionName }) => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('questions');
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [section, setSection] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);

  // Time Limits & Settings State
  const [timeLimits, setTimeLimits] = useState<Record<string, number>>({});
  const [passingPercentage, setPassingPercentage] = useState<number>(70); // Default 70%
  const [savingSettings, setSavingSettings] = useState(false);

  // Bulk Import State
  const [showBulk, setShowBulk] = useState(false);
  const [bulkJson, setBulkJson] = useState('');
  
  // Search/Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSection, setFilterSection] = useState('all');

  useEffect(() => {
    if (isOpen && chapterId) {
      fetchQuestions();
      fetchSettings();
      resetForm();
      setShowBulk(false);
      setActiveTab('questions');
      setSearchQuery('');
      setFilterSection('all');
    }
  }, [isOpen, chapterId]);

  const fetchSettings = async () => {
    try {
      const chDoc = await getDoc(doc(db, collectionName, chapterId));
      if (chDoc.exists()) {
        const data = chDoc.data();
        setTimeLimits(data.timeLimits || {});
        if (data.passingPercentage !== undefined) {
          setPassingPercentage(data.passingPercentage);
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const qSnap = await getDocs(collection(db, collectionName, chapterId, 'questions'));
      setQuestions(qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
    } catch (error) {
      console.error(error);
      showToast('Error fetching questions', 'error');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setText('');
    setSection('');
    setOptions(['', '', '', '']);
    setCorrectAnswer(0);
  };

  const handleEdit = (q: Question) => {
    setEditingId(q.id);
    setText(q.text);
    setSection(q.section || '');
    setOptions([...q.options]);
    setCorrectAnswer(q.correctAnswer);
    setShowBulk(false);
    setActiveTab('questions');
    // Scroll to top of modal body
    document.querySelector('.modal-body')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOptionChange = (index: number, val: string) => {
    const newOptions = [...options];
    newOptions[index] = val;
    setOptions(newOptions);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text || options.some(o => !o)) {
      showToast('Please fill out the question and all 4 options.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const qId = editingId || `q_${Date.now()}`;
      const payload: Partial<Question> = { text, options, correctAnswer };
      if (section.trim()) payload.section = section.trim();
      
      await setDoc(doc(db, collectionName, chapterId, 'questions', qId), payload);
      resetForm();
      await fetchQuestions();
    } catch (error) {
      console.error(error);
      showToast('Error saving question', 'error');
    }
    setLoading(false);
  };

  const handleDelete = async (qId: string) => {
    const ok = await confirm({ title: 'Delete Question', message: 'Are you sure you want to delete this question?', confirmText: 'Delete', variant: 'danger' });
    if (ok) {
      setLoading(true);
      await deleteDoc(doc(db, collectionName, chapterId, 'questions', qId));
      await fetchQuestions();
    }
  };

  const handleDeleteAllQuestions = async () => {
    if (questions.length === 0) {
      showToast('No questions to delete.', 'info');
      return;
    }
    const ok = await confirm({ 
      title: 'Delete All Questions', 
      message: 'Are you absolutely sure you want to delete ALL questions for this chapter? This action cannot be undone.', 
      confirmText: 'Delete All', 
      variant: 'danger' 
    });
    
    if (ok) {
      setLoading(true);
      try {
        const batch = writeBatch(db);
        questions.forEach(q => {
          batch.delete(doc(db, collectionName, chapterId, 'questions', q.id));
        });
        await batch.commit();
        await fetchQuestions();
        showToast('All questions deleted successfully.', 'success');
      } catch (error) {
        console.error(error);
        showToast('Error deleting questions.', 'error');
      }
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    try {
      const data = JSON.parse(bulkJson);
      if (!data.questions && !data.sections) {
        showToast('Invalid JSON format. Expected {"questions": [...]} or {"sections": {...}}', 'error');
        return;
      }

      setLoading(true);
      const batch = writeBatch(db);
      
      let allQuestions: any[] = [];
      
      if (data.questions) {
        allQuestions = data.questions;
      } else if (data.sections) {
        Object.keys(data.sections).forEach(secKey => {
           const sec = data.sections[secKey];
           sec.questions.forEach((q: any) => {
             allQuestions.push({ ...q, sectionId: sec.title || secKey });
           });
        });
      }
      
      allQuestions.forEach((q: any) => {
        const qRef = doc(collection(db, collectionName, chapterId, 'questions'));
        
        let formattedOptions = [];
        let correctIdx = 0;
        
        if (q.options) {
          formattedOptions = q.options;
          correctIdx = q.correctAnswer !== undefined ? q.correctAnswer : 0;
        } else if (q.optionA) {
          formattedOptions = [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean);
          const correctLetter = q.correct || 'A';
          correctIdx = correctLetter === 'A' ? 0 : correctLetter === 'B' ? 1 : correctLetter === 'C' ? 2 : 3;
        }

        const payload: any = {
          text: q.question || q.text || 'Untitled Question',
          options: formattedOptions,
          correctAnswer: correctIdx
        };
        
        if (q.sectionId || q.section) {
          payload.section = q.sectionId || q.section;
        }

        batch.set(qRef, payload);
      });

      await batch.commit();
      setShowBulk(false);
      setBulkJson('');
      await fetchQuestions();
      showToast(`Successfully imported ${allQuestions.length} questions!`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Error parsing or importing JSON: ' + (error as Error).message, 'error');
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await updateDoc(doc(db, collectionName, chapterId), { 
        timeLimits,
        passingPercentage 
      });
      showToast('Settings saved successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Error saving settings.', 'error');
    }
    setSavingSettings(false);
  };

  const uniqueSections = Array.from(new Set(questions.map(q => q.section).filter(Boolean))).sort() as string[];

  // Filtered questions
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = !searchQuery || q.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSection = filterSection === 'all' || (q.section || 'Uncategorized') === filterSection;
    return matchesSearch && matchesSection;
  });

  // Group questions by section for display
  const groupedQuestions: Record<string, Question[]> = {};
  filteredQuestions.forEach(q => {
    const sec = q.section || 'Uncategorized';
    if (!groupedQuestions[sec]) groupedQuestions[sec] = [];
    groupedQuestions[sec].push(q);
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '860px', width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ marginBottom: '2px' }}>Manage Quiz</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{chapterTitle}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="badge badge-neutral">{questions.length} questions</span>
            <span className="badge badge-neutral">{uniqueSections.length} sections</span>
            <button type="button" className="modal-close" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{ 
          display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', 
          padding: '0 24px', background: 'var(--bg-card)', flexShrink: 0
        }}>
          <button 
            className={`tab-item ${activeTab === 'questions' ? 'active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            <i className="fas fa-list-ol" style={{ marginRight: '6px' }}></i> Questions
          </button>
          <button 
            className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <i className="fas fa-cog" style={{ marginRight: '6px' }}></i> Settings
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px 24px' }}>
          
          {/* ============ QUESTIONS TAB ============ */}
          {activeTab === 'questions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Add/Edit Form Card */}
              <div style={{ 
                background: editingId ? 'var(--info-bg)' : 'var(--bg-body)', 
                border: `1px solid ${editingId ? 'var(--info-border)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)', 
                padding: '20px' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className={`fas ${editingId ? 'fa-pen' : showBulk ? 'fa-file-import' : 'fa-plus-circle'}`} style={{ color: editingId ? 'var(--info)' : 'var(--text-muted)' }}></i>
                    {editingId ? 'Editing Question' : showBulk ? 'Bulk Import' : 'Add Question'}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {editingId && (
                      <button className="btn btn-outline btn-sm" onClick={resetForm}>
                        <i className="fas fa-times"></i> Cancel
                      </button>
                    )}
                    {!editingId && !showBulk && (
                      <button className="btn btn-outline btn-sm" onClick={() => setShowBulk(true)}>
                        <i className="fas fa-file-import"></i> Bulk Import
                      </button>
                    )}
                    {showBulk && (
                      <button className="btn btn-outline btn-sm" onClick={() => setShowBulk(false)}>
                        <i className="fas fa-pen"></i> Manual
                      </button>
                    )}
                  </div>
                </div>

                {showBulk ? (
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      Paste your quiz JSON here. Supports both <code>{"{"}"questions": [...]{"}"}</code> and <code>{"{"}"sections": {"{"}"...{"}"}{"}"}{"}"}</code> formats.
                    </p>
                    <textarea 
                      rows={6} 
                      style={{ 
                        width: '100%', padding: '10px 12px', fontFamily: 'monospace', fontSize: '12px', 
                        marginBottom: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-card)', resize: 'vertical'
                      }}
                      placeholder='Paste JSON content here...'
                      value={bulkJson}
                      onChange={e => setBulkJson(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={handleBulkImport} disabled={loading || !bulkJson}>
                      <i className="fas fa-upload"></i> {loading ? 'Importing...' : 'Import Questions'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSaveQuestion}>
                    {/* Question + Section Row */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                      <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                        <label>Question</label>
                        <input type="text" required value={text} onChange={e => setText(e.target.value)} placeholder="Enter your question..." />
                      </div>
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label>Section <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                        <input 
                          type="text" value={section} onChange={e => setSection(e.target.value)} 
                          placeholder="e.g. Basics" 
                          list="section-suggestions"
                        />
                        <datalist id="section-suggestions">
                          {uniqueSections.map(s => <option key={s} value={s} />)}
                        </datalist>
                      </div>
                    </div>
                    
                    {/* Options Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                      {[0, 1, 2, 3].map(idx => (
                        <div key={idx} style={{ 
                          display: 'flex', alignItems: 'center', gap: '8px',
                          background: correctAnswer === idx ? 'var(--success-bg)' : 'var(--bg-card)',
                          border: `1px solid ${correctAnswer === idx ? 'var(--success-border)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-md)', padding: '8px 10px',
                          cursor: 'pointer', transition: 'all 0.15s ease'
                        }} onClick={() => setCorrectAnswer(idx)}>
                          <div style={{ 
                            width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: correctAnswer === idx ? 'var(--success)' : 'var(--bg-body)',
                            color: correctAnswer === idx ? '#fff' : 'var(--text-secondary)',
                            fontWeight: 700, fontSize: '12px', transition: 'all 0.15s ease'
                          }}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <input 
                            type="text" required value={options[idx]} 
                            onChange={e => handleOptionChange(idx, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                            onClick={e => e.stopPropagation()}
                            style={{ 
                              border: 'none', background: 'transparent', outline: 'none',
                              padding: '4px 0', fontSize: '13px', width: '100%', boxShadow: 'none'
                            }}
                          />
                          {correctAnswer === idx && (
                            <i className="fas fa-check-circle" style={{ color: 'var(--success)', fontSize: '14px', flexShrink: 0 }}></i>
                          )}
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '4px' }}></i>
                      Click on an option row to mark it as the correct answer.
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="submit" className="btn btn-primary" disabled={loading}>
                        <i className="fas fa-save"></i> {loading ? 'Saving...' : (editingId ? 'Update' : 'Add Question')}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Questions List */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', flexShrink: 0 }}>
                    Questions ({filteredQuestions.length})
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button 
                      className="btn btn-outline btn-sm" 
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)', background: 'var(--danger-bg)' }}
                      onClick={handleDeleteAllQuestions}
                      disabled={questions.length === 0}
                    >
                      <i className="fas fa-trash-alt"></i> Delete All
                    </button>
                    {uniqueSections.length > 0 && (
                      <select
                        value={filterSection}
                        onChange={e => setFilterSection(e.target.value)}
                        style={{ 
                          padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)',
                          color: 'var(--text-primary)', cursor: 'pointer', minWidth: '140px'
                        }}
                      >
                        <option value="all">All Sections</option>
                        {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                    <div className="search-input" style={{ width: '180px' }}>
                      <i className="fas fa-search"></i>
                      <input 
                        type="text" placeholder="Search..." 
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                
                {filteredQuestions.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)',
                    background: 'var(--bg-body)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)'
                  }}>
                    <i className="fas fa-inbox" style={{ fontSize: '28px', marginBottom: '10px', display: 'block' }}></i>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      {questions.length === 0 ? 'No questions yet. Add one above or use bulk import.' : 'No questions match your filter.'}
                    </p>
                  </div>
                ) : (
                  <div style={{ 
                    display: 'flex', flexDirection: 'column', gap: '8px', 
                    maxHeight: '420px', overflowY: 'auto', paddingRight: '4px'
                  }}>
                    {Object.entries(groupedQuestions).sort(([a], [b]) => a.localeCompare(b)).map(([secName, secQuestions]) => (
                      <div key={secName}>
                        {(uniqueSections.length > 0 || secName !== 'Uncategorized') && filterSection === 'all' && (
                          <div style={{ 
                            fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', 
                            textTransform: 'uppercase', letterSpacing: '0.5px',
                            padding: '8px 0 4px', marginTop: '4px'
                          }}>
                            {secName} ({secQuestions.length})
                          </div>
                        )}
                        {secQuestions.map((q) => (
                          <div key={q.id} style={{ 
                            border: '1px solid var(--border)', padding: '12px 14px', borderRadius: 'var(--radius-md)',
                            background: editingId === q.id ? 'var(--info-bg)' : 'var(--bg-card)',
                            transition: 'all 0.15s ease'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                  {q.text}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                  {q.options.map((opt, oIdx) => (
                                    <span key={oIdx} style={{ 
                                      fontSize: '11px', padding: '2px 8px', borderRadius: '6px',
                                      background: q.correctAnswer === oIdx ? 'var(--success-bg)' : 'var(--bg-body)',
                                      color: q.correctAnswer === oIdx ? 'var(--success)' : 'var(--text-secondary)',
                                      border: `1px solid ${q.correctAnswer === oIdx ? 'var(--success-border)' : 'var(--border)'}`,
                                      fontWeight: q.correctAnswer === oIdx ? 600 : 400
                                    }}>
                                      {String.fromCharCode(65 + oIdx)}. {opt} {q.correctAnswer === oIdx && '✓'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                <button className="icon-btn" onClick={() => handleEdit(q)} title="Edit">
                                  <i className="fas fa-pen"></i>
                                </button>
                                <button className="icon-btn danger" onClick={() => handleDelete(q.id)} title="Delete">
                                  <i className="fas fa-trash-alt"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============ SETTINGS TAB ============ */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Timer Settings */}
              <div style={{ 
                background: 'var(--bg-body)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: '15px' }}>
                      <i className="fas fa-clock" style={{ marginRight: '8px', color: 'var(--text-muted)' }}></i>
                      Time Limits
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                      Set time limits in minutes. Empty or 0 means unlimited.
                    </p>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveSettings} disabled={savingSettings}>
                    <i className="fas fa-save"></i> {savingSettings ? 'Saving...' : 'Save All Settings'}
                  </button>
                </div>

                {/* Global Timer */}
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '14px'
                }}>
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--primary)', color: '#fff', fontSize: '14px'
                  }}>
                    <i className="fas fa-globe"></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Global Default</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Applies to all sections unless overridden</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input 
                      type="number" min="0" 
                      value={timeLimits['global'] || ''} 
                      onChange={e => setTimeLimits({...timeLimits, global: Number(e.target.value)})}
                      placeholder="0"
                      style={{ 
                        width: '70px', padding: '6px 10px', fontSize: '14px', fontWeight: 600,
                        textAlign: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-card)'
                      }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>min</span>
                  </div>
                </div>

                {/* Per-section Timers */}
                {uniqueSections.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      Section Overrides
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {uniqueSections.map(sec => (
                        <div key={sec} style={{ 
                          display: 'flex', alignItems: 'center', gap: '12px',
                          background: 'var(--bg-card)', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)', padding: '8px 14px'
                        }}>
                          <div style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sec}>
                            {sec}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input 
                              type="number" min="0"
                              value={timeLimits[sec] || ''} 
                              onChange={e => setTimeLimits({...timeLimits, [sec]: Number(e.target.value)})}
                              placeholder="Global"
                              style={{ 
                                width: '70px', padding: '5px 8px', fontSize: '13px', fontWeight: 600,
                                textAlign: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-card)'
                              }}
                            />
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>min</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uniqueSections.length === 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                    No sections found. Add questions with section names to configure per-section timers.
                  </p>
                )}
              </div>

              {/* Quiz Grading Settings */}
              <div style={{ 
                background: 'var(--bg-body)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: '15px' }}>
                      <i className="fas fa-percent" style={{ marginRight: '8px', color: 'var(--text-muted)' }}></i>
                      Grading & Pass Rate
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                      Minimum score required to pass the quiz.
                    </p>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', padding: '12px 14px'
                }}>
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--success)', color: '#fff', fontSize: '14px'
                  }}>
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Passing Percentage</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Users scoring below this will fail and cannot see correct answers.</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input 
                      type="number" min="1" max="100" 
                      value={passingPercentage} 
                      onChange={e => setPassingPercentage(Number(e.target.value))}
                      style={{ 
                        width: '70px', padding: '6px 10px', fontSize: '14px', fontWeight: 600,
                        textAlign: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-card)'
                      }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>%</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ManageQuizModal;
