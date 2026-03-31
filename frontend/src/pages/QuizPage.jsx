import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaBrain, FaCheckCircle, FaTimesCircle, FaChevronLeft, FaChevronRight, FaArchive } from 'react-icons/fa';

function QuizPage() {
  const { weekId } = useParams();
  const navigate = useNavigate();

  // Configuration States
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(10); // Default to 10 questions
  const [isGenerating, setIsGenerating] = useState(false);

  // Quiz Execution States
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAIQuiz, setIsAIQuiz] = useState(false);
  const [userRole, setUserRole] = useState('student');
  const [loadingExplanations, setLoadingExplanations] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);


  // Initial load for Weekly Assessments if weekId exists
  useEffect(() => {
    fetchUserRole();
    if (weekId) {
      fetchWeeklyExam();
    }
  }, [weekId]);

  // Timer Effect
  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !isSubmitted) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timeLeft, isSubmitted]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const fetchUserRole = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role || 'student');
      }
    } catch (err) {
      console.error("Error fetching role:", err);
    }
  };

  const fetchWeeklyExam = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const weekNumber = parseInt(weekId.replace('week-', '')) || 1;
      
      // Fetch performance to check schedule/lock
      const perfResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/analytics/performance`, { headers });
      if (perfResponse.ok) {
        const perfData = await perfResponse.json();
        const schedule = perfData.trainingSchedule || [];
        const weekInfo = schedule.find(s => s.week === weekNumber);
        
        const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/user/profile`, { headers });
        const user = await userResponse.json(); 
        
        const unlockDate = weekInfo ? weekInfo.examDate : null;
        console.log('User Role:', user.role, 'Today:', new Date(), 'UnlockDate:', unlockDate);

        // Demo Exam Rule: Week 1 is ALWAYS unlocked for everyone
        let isLocked = false;
        const isAdmin = user.role === 'admin' || user.phone === '9493649788';
        
        if (!isAdmin && weekNumber !== 1) {
          isLocked = unlockDate ? (new Date() < new Date(unlockDate)) : true;
        }

        console.log('Final isLocked:', isLocked);

        if (isLocked) {
          throw new Error(`This assessment is locked. It will unlock on ${new Date(unlockDate).toLocaleDateString()}.`);
        }
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/training/exam/${weekNumber}`, { headers });
      if (!response.ok) throw new Error("Failed to fetch exam questions.");
      const examData = await response.json();
      
      setQuestions(examData.examQuestions);
      if (examData.timeLimit) {
        setTimeLeft(examData.timeLimit * 60);
      } else {
        setTimeLeft(60 * 60); // Default to 60 mins if not provided
      }
      setIsAIQuiz(false);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleGenerateAIQuiz = async () => {
    if (!subject || !topic) {
      alert("Please provide both a Subject and a Topic to generate a quiz.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/quiz/generate-ai-quiz`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          subject,
          topic,
          numQuestions: questionCount
        })
      });

      const data = await response.json();
      if (response.ok && !data.retry) { // Check for retry flag from backend
        setQuestions(data);
        // setTimeLeft(null); // No time limit for AI quiz
        setIsAIQuiz(true);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setIsSubmitted(false);
      } else {
        // If backend returns a retry message or other error
        setError(data.message || "Failed to generate AI quiz. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Error connecting to AI service. Please check your network or try again.");
    }
    finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerSelect = (option) => {
    if (isSubmitted) return;
    setUserAnswers({ ...userAnswers, [currentQuestionIndex]: option });
  };

  const handleSubmit = async () => {
    if (isSubmitted) return;
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      };

      // 1. Calculate Results Locally
      let correctCount = 0;
      let wrongCount = 0;
      let unattemptedCount = 0;

      const reviewData = questions.map((q, idx) => {
        const userAnswer = userAnswers[idx];
        const isCorrect = userAnswer === q.options[q.correctAnswer] || userAnswer === q.answer;
        
        if (!userAnswer) unattemptedCount++;
        else if (isCorrect) correctCount++;
        else wrongCount++;

        return {
          ...q,
          userAnswer,
          isCorrect
        };
      });

      const finalResult = {
        score: (correctCount * 4) - (wrongCount * 1),
        total: questions.length,
        percentage: (correctCount / questions.length) * 100,
        correctCount,
        wrongCount,
        unattemptedCount,
        reviewData
      };

      // 2. Submit to Backend if it's a Weekly Training Exam
      if (weekId) {
        const weekNumber = parseInt(weekId.replace('week-', '')) || 1;
        const submissionBody = {
          weekNumber,
          examType: weekNumber % 4 === 0 ? 'monthly' : 'weekly',
          userAnswers: questions.map((q, idx) => ({
            questionId: q._id,
            answer: userAnswers[idx],
            correctAnswer: q.options ? q.options[q.correctAnswer] : q.answer,
            subject: q.subject,
            topic: q.topic
          })),
          totalQuestions: questions.length,
          timeTaken: 0 // Could add timer logic later if needed
        };

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/training/submit-exam`, {
          method: 'POST',
          headers,
          body: JSON.stringify(submissionBody)
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Submission failed:", errorData.message);
        }
      }

      setResult(finalResult);
      setIsSubmitted(true);
    } catch (err) {
      console.error("Error during submission:", err);
      setError("Failed to submit exam results.");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchExplanation = async (questionId) => {
    // For AI generated quiz, the explanation is already part of the question object.
    alert("Explanation is already provided within the AI generated quiz.");
    setLoadingExplanations(prev => ({ ...prev, [questionId]: false })); // Ensure loading state is reset
  };

  // --- RENDER VIEWS ---

  // 1. Setup View
  if (!weekId && questions.length === 0 && !isGenerating) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-10 animate-fadeIn">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <FaBrain className="text-4xl" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">AI Quiz Section</h2>
          <p className="text-slate-500 font-medium text-lg">Generate high-yield clinical MCQs on any Homeopathy topic.</p>
        </div>

        <div className="bg-white p-10 rounded-[40px] shadow-3xl border border-slate-100 space-y-8 min-h-[400px]">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
            <input 
              type="text" 
              placeholder="e.g., Anatomy, Organon, Pharmacy" 
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Topic / Chapter</label>
            <input 
              type="text" 
              placeholder="e.g., Upper Limb, Miasms, Posology" 
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Number of Questions</label>
            <select 
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all appearance-none cursor-pointer"
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
            >
              <option value={10}>10 Questions</option>
              <option value={20}>20 Questions</option>
            </select>
          </div>

          <button 
            onClick={handleGenerateAIQuiz}
            className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl hover:bg-black transition-all shadow-2xl shadow-slate-200 uppercase tracking-widest flex items-center justify-center gap-3"
          >
            <FaBrain /> Generate AI Quiz
          </button>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-center font-bold">{error}</div>}
      </div>
    );
  }

  // 2. Generating View
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-6">
        <div className="relative">
          <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-indigo-600"></div>
          <FaBrain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl text-indigo-600 animate-pulse" />
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-black text-slate-900">AI is preparing your Homeopathy Quiz...</h3>
          <p className="text-slate-500 font-medium">Generating high-quality clinical MCQs for {topic}.</p>
        </div>
      </div>
    );
  }

  // 3. Result View
  if (isSubmitted && result) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-10 animate-fadeIn">
        <div className="bg-white rounded-[48px] shadow-3xl overflow-hidden border border-slate-50">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-12 text-white text-center relative">
            <div className="relative z-10 space-y-2">
              <h2 className="text-4xl font-black italic">Quiz Completed!</h2>
              <p className="text-indigo-100 font-bold uppercase tracking-widest text-sm">Target: {topic}</p>
              <div className="mt-8 inline-block bg-white/10 backdrop-blur-md px-10 py-6 rounded-3xl border border-white/20">
                <p className="text-[10px] font-black uppercase opacity-70 mb-1">Your Score</p>
                <p className="text-5xl font-black">{result.score} <span className="text-xl opacity-50">/ {result.total}</span></p>
              </div>
            </div>
          </div>

          <div className="p-10 space-y-8">
            <h3 className="text-2xl font-black text-slate-900 border-b-4 border-indigo-50 pb-4">Performance Review</h3>
            <div className="space-y-6">
              {result.reviewData.map((q, i) => (
                <div key={i} className={`p-8 rounded-[32px] border-l-8 transition-all ${q.isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black px-3 py-1 bg-white text-slate-500 rounded-full border border-slate-100 uppercase">Q{i + 1}</span>
                    {q.isCorrect ? <FaCheckCircle className="text-green-500 text-xl" /> : <FaTimesCircle className="text-red-500 text-xl" />}
                  </div>
                  <p className="font-bold text-slate-800 text-lg mb-6">{q.question}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {q.options.map((opt, idx) => {
                      const isUserAnswer = userAnswers[i] === opt; // Use userAnswers[i] to get the selected option text
                      const isCorrectAnswer = q.options[q.correctAnswer] === opt; // Compare with the correct option text
                      let btnClass = "bg-white border-slate-100 text-slate-600";
                      
                      if (isCorrectAnswer) btnClass = "bg-green-100 border-green-500 text-green-900";
                      else if (isUserAnswer) btnClass = "bg-red-100 border-red-500 text-red-900";

                      return (
                        <div key={idx} className={`p-4 rounded-2xl text-sm font-bold border-2 ${btnClass}`}>
                           {opt}
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-white/60 p-6 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <FaBrain className="text-indigo-400" /> Mentor's Insight
                      </p>
                      <button 
                        onClick={() => alert("Explanation is already provided within the AI generated quiz.")}
                        className="text-[10px] font-bold text-indigo-600 hover:underline disabled:opacity-50"
                      >
                        Explanation Available
                      </button>
                    </div>
                    <p className="text-slate-700 leading-relaxed text-sm italic whitespace-pre-wrap">{q.explanation || "Explanation will be provided here."}</p>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => {
                setQuestions([]);
                setIsSubmitted(false);
                setResult(null);
                navigate('/quiz');
              }}
              className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl hover:bg-black transition-all shadow-xl"
            >
              Take Another Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Active Exam View
  const currentQuestion = questions[currentQuestionIndex];

  if (loading) return <div className="p-20 text-center font-black animate-pulse">Loading Quiz...</div>;
  if (error) return (
    <div className="p-20 text-center">
      <div className="bg-red-50 text-red-600 p-8 rounded-3xl border border-red-100">
        <h3 className="text-2xl font-black mb-2">Quiz Error!</h3>
        <p className="font-bold">{error}</p>
        <button onClick={() => {
          setError(null);
          setIsGenerating(false);
          setQuestions([]);
          setCurrentQuestionIndex(0);
        }} className="mt-6 px-6 py-2 bg-red-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest">Try Another Quiz</button>
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header with Timer */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100 gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-black text-slate-900">{weekId ? `Weekly Assessment: ${weekId}` : `AI Quiz: ${subject || 'Custom'}`}</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">{`Question ${currentQuestionIndex + 1} of ${questions.length}`}</p>
          </div>
          {timeLeft !== null && (
            <div className={`px-8 py-4 rounded-3xl border-2 flex flex-col items-center min-w-[160px] ${timeLeft < 300 ? 'bg-red-50 border-red-500 animate-pulse' : 'bg-indigo-50 border-indigo-200'}`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Time Remaining</p>
              <p className={`text-3xl font-black ${timeLeft < 300 ? 'text-red-600' : 'text-indigo-600'}`}>{formatTime(timeLeft)}</p>
            </div>
          )}
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-[48px] shadow-3xl overflow-hidden border border-slate-100 flex flex-col min-h-[500px]">
          <div className="h-3 bg-slate-100 w-full">
            <div 
              className="h-full bg-indigo-600 transition-all duration-500" 
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
          
          <div className="p-10 md:p-16 flex-grow">
            <div className="mb-10">
              <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-8">
                 <div className="flex gap-4 items-center">
                    <span className="bg-indigo-600 text-white text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-100">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    {isAIQuiz && currentQuestion?.explanation && (
                      <span className="text-[10px] font-black px-3 py-1 bg-green-50 text-green-600 rounded-full border border-green-100 uppercase">AI Generated</span>
                    )}
                 </div>
                {/* Removed currentQuestion?.subject display as it's now handled by the separate input */}

              </div>
              <h3 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight text-center">
                {currentQuestion?.question}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {currentQuestion?.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(option)}
                  className={`group p-6 rounded-3xl text-left transition-all duration-300 border-2 flex items-center gap-6 ${userAnswers[currentQuestionIndex] === option ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-[1.02]' : 'bg-white border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/30'}`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all ${userAnswers[currentQuestionIndex] === option ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className={`text-lg font-bold ${userAnswers[currentQuestionIndex] === option ? 'text-white' : 'text-slate-700'}`}>
                    {option}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
            <button
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-slate-400 hover:bg-slate-200 transition-all disabled:opacity-20 uppercase text-xs tracking-widest"
            >
              <FaChevronLeft /> Previous
            </button>
            
            {currentQuestionIndex === (questions.length - 1) ? (
              <button
                onClick={handleSubmit}
                className="px-12 py-5 bg-green-600 text-white font-black rounded-3xl hover:bg-green-700 transition-all shadow-2xl shadow-green-100 uppercase text-sm tracking-[0.2em]"
              >
                Finish Quiz
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                className="flex items-center gap-3 px-12 py-5 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 uppercase text-sm tracking-[0.2em]"
              >
                Next <FaChevronRight />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuizPage;

