import React, { useState, useEffect, useRef } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';
import '../styles/Quiz.css';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  section?: string;
}

const HiringTest: React.FC = () => {
  // Candidate Info State
  const [step, setStep] = useState<'registration' | 'quiz' | 'result'>('registration');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Quiz State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [timeLimits, setTimeLimits] = useState<Record<string, number>>({});
  
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const chDoc = await getDoc(doc(db, 'hiring', 'quiz'));
        let limits: Record<string, number> = {};
        if (chDoc.exists()) {
          limits = chDoc.data().timeLimits || {};
          setTimeLimits(limits);
        }
        
        const qSnap = await getDocs(collection(db, 'hiring', 'quiz', 'questions'));
        if (!qSnap.empty) {
          const fetchedQuestions = qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
          setQuestions(fetchedQuestions);
          
          const uniqueSections = Array.from(new Set(fetchedQuestions.map(q => q.section || 'General'))).sort();
          setSections(uniqueSections);
          
          const initialSection = uniqueSections[0];
          const limitInMinutes = limits[initialSection] || limits['global'] || 0;
          if (limitInMinutes > 0) setTimeLeft(limitInMinutes * 60);
        }
      } catch (error) {
        console.error("Error fetching hiring quiz:", error);
      }
    };
    
    if (step === 'registration') {
      fetchQuiz();
    }
  }, [step]);

  // Timer effect
  useEffect(() => {
    if (step !== 'quiz' || timeLeft === null) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (timeLeft <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (currentSectionIndex < sections.length - 1) {
        // Auto-advance
        const nextSection = sections[currentSectionIndex + 1];
        setCurrentSectionIndex(currentSectionIndex + 1);
        setCurrentQuestionIndex(0);
        const limitInMinutes = timeLimits[nextSection] || timeLimits['global'] || 0;
        setTimeLeft(limitInMinutes > 0 ? limitInMinutes * 60 : null);
      } else {
        handleSubmit();
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => prev !== null ? prev - 1 : null);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, step, currentSectionIndex, sections.length]);

  const handleStartQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) return;
    if (questions.length === 0) {
      alert("There are no questions currently available. Please contact administration.");
      return;
    }
    setStep('quiz');
  };

  const handleSelect = (qId: string, optIdx: number) => {
    setAnswers({ ...answers, [qId]: optIdx });
  };

  const currentSection = sections[currentSectionIndex];
  const currentSectionQuestions = questions.filter(q => (q.section || 'General') === currentSection);
  const currentQuestion = currentSectionQuestions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  const handleNext = () => {
    if (currentQuestionIndex < currentSectionQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentSectionIndex < sections.length - 1) {
      setShowSectionModal(true);
    } else {
      setShowConfirmModal(true);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const continueToNextSection = () => {
    setShowSectionModal(false);
    const nextSection = sections[currentSectionIndex + 1];
    setCurrentSectionIndex(currentSectionIndex + 1);
    setCurrentQuestionIndex(0);
    
    const limitInMinutes = timeLimits[nextSection] || timeLimits['global'] || 0;
    setTimeLeft(limitInMinutes > 0 ? limitInMinutes * 60 : null);
  };

  const handleSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    
    let calculatedScore = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) calculatedScore++;
    });

    try {
      await addDoc(collection(db, 'hiringResults'), {
        name,
        email,
        phone,
        score: calculatedScore,
        totalQuestions: questions.length,
        answers,
        timestamp: new Date().toISOString()
      });
      
      setFinalScore(calculatedScore);
      setStep('result');
    } catch (error) {
      console.error("Error submitting test:", error);
      alert("There was an error submitting your test. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (step === 'registration') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-body)', padding: '20px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '40px', borderRadius: '24px', boxShadow: 'var(--shadow-lg)', maxWidth: '480px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <img src="/assets/images/AH1.png" alt="AssistHealth" style={{ height: '48px', marginBottom: '16px' }} />
            <h1 style={{ fontSize: '24px', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Pre-Employment Test</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '15px' }}>
              Please enter your details below to begin the assessment.
            </p>
          </div>
          
          <form onSubmit={handleStartQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>Full Name <span style={{color: 'var(--danger)'}}>*</span></label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jane Doe" style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '15px' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>Email Address <span style={{color: 'var(--danger)'}}>*</span></label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. jane@example.com" style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '15px' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>Phone Number <span style={{color: 'var(--danger)'}}>*</span></label>
              <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +1 234 567 8900" style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '15px' }} />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600, marginTop: '10px', borderRadius: '12px', justifyContent: 'center' }} disabled={questions.length === 0}>
              {questions.length === 0 ? 'Loading Test...' : 'Start Test'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'result') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-body)', padding: '20px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '40px', borderRadius: '24px', boxShadow: 'var(--shadow-lg)', maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 24px' }}>
            <i className="fas fa-check"></i>
          </div>
          <h1 style={{ fontSize: '28px', margin: '0 0 12px 0', color: 'var(--text-primary)' }}>Test Submitted!</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 32px 0', fontSize: '16px', lineHeight: 1.5 }}>
            Thank you for completing the pre-employment assessment, {name}. Your results have been recorded.
          </p>
          <div style={{ background: 'var(--bg-body)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '32px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Your Score</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--primary)' }}>
              {finalScore} <span style={{ fontSize: '20px', color: 'var(--text-muted)' }}>/ {totalQuestions}</span>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            You may now close this window. Our team will be in touch with you shortly.
          </p>
        </div>
      </div>
    );
  }

  // Quiz Interface
  const isWarning = timeLeft !== null && timeLeft <= 60;
  const progressPercent = currentSectionQuestions.length > 0
    ? ((currentQuestionIndex + 1) / currentSectionQuestions.length) * 100
    : 0;
  const isLastQuestion = currentSectionIndex === sections.length - 1 && currentQuestionIndex === currentSectionQuestions.length - 1;

  if (!currentQuestion) return null;

  return (
    <div className="quiz-page-wrapper">
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/assets/images/AH1.png" alt="AssistHealth" style={{ height: '32px' }} />
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Pre-Employment Test</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          <i className="fas fa-user-circle"></i> {name}
        </div>
      </div>
      
      {/* Fixed Timer */}
      <div className={`quiz-timer-bar ${isWarning ? 'quiz-timer-warning' : ''}`}>
        <div className="quiz-timer-label">Timer</div>
        <div className="quiz-timer-text">{timeLeft !== null ? formatTime(timeLeft) : '∞'}</div>
        {sections.length > 1 && (
          <div className="quiz-timer-section-name" title={currentSection}>{currentSectionIndex + 1}/{sections.length}</div>
        )}
      </div>

      <div className="quiz-content-area">
        {/* Progress */}
        <div className="quiz-progress-wrap" style={{ marginTop: '20px' }}>
          <div className="quiz-progress-info">
            {sections.length > 1 && (
              <span className="quiz-progress-section">
                {currentSection} ({currentSectionIndex + 1}/{sections.length})
              </span>
            )}
            <span className="quiz-progress-count">
              Question {currentQuestionIndex + 1} of {currentSectionQuestions.length}
            </span>
          </div>
          <div className="quiz-progress-track">
            <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="quiz-question-card" key={`${currentSectionIndex}-${currentQuestionIndex}`}>
          <div className="quiz-question-number">Question {currentQuestionIndex + 1}</div>
          <div className="quiz-question-text">{currentQuestion.text}</div>
          <div className="quiz-options-container">
            {currentQuestion.options.map((opt, oIdx) => {
              const isSelected = answers[currentQuestion.id] === oIdx;
              
              let cardClass = 'quiz-option-card';
              if (isSelected) cardClass += ' selected';

              return (
                <div 
                  key={oIdx} 
                  className={cardClass}
                  onClick={() => handleSelect(currentQuestion.id, oIdx)}
                >
                  <div className="quiz-option-letter">{String.fromCharCode(65 + oIdx)}</div>
                  <div className="quiz-option-text">{opt}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="quiz-navigation">
          <button 
            className="quiz-nav-btn quiz-nav-btn-secondary" 
            onClick={handlePrev}
            disabled={currentSectionIndex === 0 && currentQuestionIndex === 0}
          >
            <i className="fas fa-arrow-left"></i> Previous
          </button>
          
          <button 
            className={`quiz-nav-btn ${isLastQuestion ? 'quiz-nav-btn-primary' : 'quiz-nav-btn-primary'}`}
            onClick={handleNext}
            disabled={isSubmitting}
          >
            {isLastQuestion 
              ? <><i className="fas fa-check"></i> Submit Test</> 
              : <>Next <i className="fas fa-arrow-right"></i></>
            }
          </button>
        </div>
      </div>

      {/* ---- SECTION COMPLETE MODAL ---- */}
      {showSectionModal && (
        <div className="quiz-modal-overlay">
          <div className="quiz-modal-content">
            <div className="quiz-modal-icon section-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h3 className="quiz-modal-title">Section Complete!</h3>
            <p className="quiz-modal-message">
              You've finished <strong>{currentSection}</strong>. Ready for the next section?
            </p>
            <div className="quiz-modal-actions">
              <button className="quiz-nav-btn quiz-nav-btn-primary" onClick={continueToNextSection}>
                Continue <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- CONFIRM MODAL ---- */}
      {showConfirmModal && (
        <div className="quiz-modal-overlay">
          <div className="quiz-modal-content">
            <div className="quiz-modal-icon confirm-icon">
              <i className="fas fa-paper-plane"></i>
            </div>
            <h3 className="quiz-modal-title">Submit Assessment?</h3>
            <p className="quiz-modal-message">
              You've answered {answeredCount} of {totalQuestions} questions.
              {answeredCount < totalQuestions && (
                <span style={{ color: '#dc2626', display: 'block', marginTop: '6px', fontWeight: 600 }}>
                  {totalQuestions - answeredCount} questions are still unanswered.
                </span>
              )}
            </p>
            <div className="quiz-modal-actions">
              <button className="quiz-nav-btn quiz-nav-btn-secondary" onClick={() => setShowConfirmModal(false)} disabled={isSubmitting}>
                Go Back
              </button>
              <button className="quiz-nav-btn quiz-nav-btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HiringTest;
