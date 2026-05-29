import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopNavbar from '../components/layout/TopNavbar';
import { db } from '../config/firebase';
import { doc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import '../styles/Quiz.css';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  section?: string;
}

const Quiz: React.FC = () => {
  const { chapterId } = useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  
  const [chapter, setChapter] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [timeLimits, setTimeLimits] = useState<Record<string, number>>({});
  
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!chapterId) return;
      
      let chDoc = await getDoc(doc(db, 'chapters', chapterId));
      let collectionName = 'chapters';
      if (!chDoc.exists()) {
        chDoc = await getDoc(doc(db, 'coordinatorChapters', chapterId));
        collectionName = 'coordinatorChapters';
      }
      
      if (chDoc.exists()) {
        setChapter({ id: chDoc.id, ...chDoc.data() });
        
        const qSnap = await getDocs(collection(chDoc.ref, 'questions'));
        let fetchedQuestions: Question[] = [];
        if (!qSnap.empty) {
          fetchedQuestions = qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
        } else {
          fetchedQuestions = [
            { id: 'q1', text: 'Sample Question 1?', options: ['A', 'B', 'C', 'D'], correctAnswer: 0, section: 'Default' },
            { id: 'q2', text: 'Sample Question 2?', options: ['A', 'B', 'C', 'D'], correctAnswer: 1, section: 'Default' }
          ];
        }
        setQuestions(fetchedQuestions);

        const limits = chDoc.data().timeLimits || {};
        setTimeLimits(limits);

        const uniqueSections = Array.from(new Set(fetchedQuestions.map(q => q.section || 'General'))).sort();
        setSections(uniqueSections);
        
        const initialSection = uniqueSections[0];
        const limitInMinutes = limits[initialSection] || limits['global'] || 0;
        
        // Attempt to load saved state from localStorage
        const savedStateJson = localStorage.getItem(`quiz_state_${chapterId}`);
        if (savedStateJson) {
          try {
            const savedState = JSON.parse(savedStateJson);
            setCurrentSectionIndex(savedState.currentSectionIndex || 0);
            setCurrentQuestionIndex(savedState.currentQuestionIndex || 0);
            setAnswers(savedState.answers || {});
            setTimeLeft(savedState.timeLeft !== undefined ? savedState.timeLeft : (limitInMinutes > 0 ? limitInMinutes * 60 : null));
          } catch (e) {
            console.error("Failed to parse saved quiz state", e);
            if (limitInMinutes > 0) setTimeLeft(limitInMinutes * 60);
          }
        } else {
          if (limitInMinutes > 0) {
            setTimeLeft(limitInMinutes * 60);
          } else {
            setTimeLeft(null);
          }
        }
      }
    };
    fetchQuiz();
  }, [chapterId]);

  // Save to localStorage effect
  useEffect(() => {
    if (!chapterId || sections.length === 0 || submitted) return;
    
    const stateToSave = {
      currentSectionIndex,
      currentQuestionIndex,
      answers,
      timeLeft
    };
    localStorage.setItem(`quiz_state_${chapterId}`, JSON.stringify(stateToSave));
  }, [chapterId, currentSectionIndex, currentQuestionIndex, answers, timeLeft, sections.length, submitted]);

  // Timer effect
  useEffect(() => {
    if (submitted || timeLeft === null) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (timeLeft <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (currentSectionIndex < sections.length - 1) {
        // Auto-advance to next section directly — no modal
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
  }, [timeLeft, submitted, currentSectionIndex, sections.length]);

  const currentSection = sections[currentSectionIndex];
  const currentSectionQuestions = questions.filter(q => (q.section || 'General') === currentSection);
  const currentQuestion = currentSectionQuestions[currentQuestionIndex];

  // Overall progress
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  const handleSelect = (qId: string, optIdx: number) => {
    if (submitted) return;
    setAnswers({ ...answers, [qId]: optIdx });
  };

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
    // Only allow going back within the current section — no cross-section back
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
    
    let calculatedScore = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) calculatedScore++;
    });

    setFinalScore(calculatedScore);
    setSubmitted(true);
    setShowResultModal(true);

    if (user && chapterId) {
      await setDoc(doc(db, 'quizResults', `${user.uid}_${chapterId}`), {
        userId: user.uid,
        chapterId,
        score: calculatedScore,
        total: questions.length,
        answers,
        submittedAt: new Date(),
        role
      });
      
      // Clear saved state so next time it starts fresh
      localStorage.removeItem(`quiz_state_${chapterId}`);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!chapter || !currentQuestion) {
    return (
      <div className="quiz-page-wrapper">
        <TopNavbar title="Quiz Mode" hideSearch />
        <div className="quiz-loading">
          <div className="quiz-loading-spinner"></div>
          <span>Loading Quiz...</span>
        </div>
      </div>
    );
  }

  const isWarning = timeLeft !== null && timeLeft <= 60;
  const progressPercent = currentSectionQuestions.length > 0
    ? ((currentQuestionIndex + 1) / currentSectionQuestions.length) * 100
    : 0;
  const isLastQuestion = currentSectionIndex === sections.length - 1 && currentQuestionIndex === currentSectionQuestions.length - 1;
  const scorePercent = totalQuestions > 0 ? Math.round((finalScore / totalQuestions) * 100) : 0;

  return (
    <div className="quiz-page-wrapper">
      <TopNavbar title="Quiz Mode" hideSearch />
      
      {/* Fixed Timer */}
      <div className={`quiz-timer-bar ${isWarning ? 'quiz-timer-warning' : ''}`}>
        <div className="quiz-timer-label">Timer</div>
        <div className="quiz-timer-text">{timeLeft !== null ? formatTime(timeLeft) : '∞'}</div>
        {sections.length > 1 && (
          <div className="quiz-timer-section-name" title={currentSection}>{currentSectionIndex + 1}/{sections.length}</div>
        )}
      </div>

      <div className="quiz-content-area">
        {/* Header */}
        <div className="quiz-top-header">
          <h1>{chapter.title}</h1>
          <button className="quiz-back-btn" onClick={() => navigate(`/${role}-dashboard`)}>
            <i className="fas fa-arrow-left"></i> Back
          </button>
        </div>

        {/* Progress */}
        <div className="quiz-progress-wrap">
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
              const isCorrect = submitted && currentQuestion.correctAnswer === oIdx;
              const isWrong = submitted && isSelected && !isCorrect;
              
              let cardClass = 'quiz-option-card';
              if (isSelected && !submitted) cardClass += ' selected';
              if (submitted) {
                if (isCorrect) cardClass += ' correct';
                if (isWrong) cardClass += ' wrong';
              }

              return (
                <div 
                  key={oIdx} 
                  className={cardClass}
                  onClick={() => handleSelect(currentQuestion.id, oIdx)}
                  style={{ pointerEvents: submitted ? 'none' : 'auto' }}
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
            disabled={submitted && showResultModal}
          >
            {isLastQuestion 
              ? <><i className="fas fa-check"></i> Submit Quiz</> 
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
            <h3 className="quiz-modal-title">Submit Quiz?</h3>
            <p className="quiz-modal-message">
              You've answered {answeredCount} of {totalQuestions} questions.
              {answeredCount < totalQuestions && (
                <span style={{ color: '#dc2626', display: 'block', marginTop: '6px', fontWeight: 600 }}>
                  {totalQuestions - answeredCount} questions are still unanswered.
                </span>
              )}
            </p>
            <div className="quiz-modal-actions">
              <button className="quiz-nav-btn quiz-nav-btn-secondary" onClick={() => setShowConfirmModal(false)}>
                Go Back
              </button>
              <button className="quiz-nav-btn quiz-nav-btn-primary" onClick={handleSubmit}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- RESULT MODAL ---- */}
      {showResultModal && (
        <div className="quiz-modal-overlay">
          <div className="quiz-modal-content">
            <div className="quiz-modal-icon result-icon">
              <i className="fas fa-trophy"></i>
            </div>
            <h3 className="quiz-modal-title">Quiz Complete!</h3>
            <div className="quiz-score-display">
              <span className="quiz-score-big">{finalScore}</span>
              <span className="quiz-score-total">/{totalQuestions}</span>
            </div>
            <div className="quiz-score-percent">{scorePercent}% Correct</div>
            <div className="quiz-modal-actions">
              <button className="quiz-nav-btn quiz-nav-btn-secondary" onClick={() => setShowResultModal(false)}>
                Review Answers
              </button>
              <button className="quiz-nav-btn quiz-nav-btn-primary" onClick={() => {
                setShowResultModal(false);
                navigate(`/${role}-dashboard`);
              }}>
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quiz;
