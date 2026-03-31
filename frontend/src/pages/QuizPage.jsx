import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaBrain, FaCheckCircle, FaTimesCircle, FaChevronLeft, FaChevronRight, FaArchive, FaClock } from 'react-icons/fa';

function QuizPage() {
  const { weekId } = useParams();
  const navigate = useNavigate();

  // Configuration & Quiz States
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);

  // Initial load
  useEffect(() => {
    if (weekId) fetchWeeklyExam();
  }, [weekId]);

  // Timer Logic
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

  const fetchWeeklyExam = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const weekNumber = parseInt(weekId.replace('week-', '')) || 1;
      
      // 1. Check Access Rules
      const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/user/profile`, { headers });
      const user = await userResponse.json();
      const isAdmin = user.role === 'admin' || user.phone === '9493649788';
      
      const perfResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/analytics/performance`, { headers });
      const perfData = await perfResponse.json();
      const weekInfo = (perfData.trainingSchedule || []).find(s => s.week === weekNumber);
      
      // Rule: Week 1 always unlocked. Others by date (except Admin).
      if (!isAdmin && weekNumber !== 1) {
        const unlockDate = weekInfo ? weekInfo.examDate : null;
        if (unlockDate && new Date() < new Date(unlockDate)) {
          throw new Error(`Locked. Unlocks on ${new Date(unlockDate).toLocaleDateString()}.`);
        }
      }

      // 2. Fetch Exam
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/training/exam/${weekNumber}`, { headers });
      if (!response.ok) throw new Error("Failed to fetch exam.");
      const examData = await response.json();
      
      setQuestions(examData.examQuestions);
      setTimeLeft(60 * 60); // Strict 60-minute limit
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleGenerateAIQuiz = async () => {
    if (!subject || !topic) return alert("Please enter subject and topic.");
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/quiz/generate-ai-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ subject, topic, numQuestions: questionCount })
      });
      const data = await response.json();
      if (response.ok) {
        setQuestions(data);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setIsSubmitted(false);
        setTimeLeft(60 * 60);
      } else {
        setError(data.message || "Generation failed.");
      }
    } catch (err) {
      setError("AI Service Error.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitted) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

      // Local Calculation
      let correct = 0, wrong = 0, unattempted = 0;
      const reviewData = questions.map((q, idx) => {
        const uAnsRaw = userAnswers[idx];
        const uAns = uAnsRaw ? String(uAnsRaw).trim().toLowerCase() : null;
        
        let cAns = "";
        if (q.options && q.correctAnswer !== undefined && (typeof q.correctAnswer === 'number' || !isNaN(q.correctAnswer))) {
          const cIdx = parseInt(q.correctAnswer, 10);
          cAns = (cIdx >= 0 && cIdx < q.options.length) ? q.options[cIdx] : (q.answer || q.correctAnswer);
        } else {
          cAns = q.answer || q.correctAnswer;
        }
        cAns = String(cAns).trim().toLowerCase();

        const isCorrect = uAns === cAns;
        if (!uAnsRaw) unattempted++;
        else if (isCorrect) correct++;
        else wrong++;

        return { ...q, userAnswer: uAnsRaw, isCorrect, correctAnswerText: cAns };
      });

      const finalScore = (correct * 4) - (wrong * 1);

      if (weekId) {
        const weekNumber = parseInt(weekId.replace('week-', '')) || 1;
        const body = {
          weekNumber,
          examType: weekNumber % 4 === 0 ? 'monthly' : 'weekly',
          userAnswers: questions.map((q, idx) => ({
            questionId: q._id || q.id,
            answer: userAnswers[idx],
            correctAnswer: q.options ? (typeof q.correctAnswer === 'number' ? q.options[q.correctAnswer] : q.answer || q.correctAnswer) : (q.answer || q.correctAnswer),
            questionText: q.question || q.questionText,
            explanation: q.explanation,
            subject: q.subject,
            topic: q.topic
          })),
          totalQuestions: questions.length,
          timeTaken: 3600 - (timeLeft || 0)
        };
        await fetch(`${import.meta.env.VITE_API_URL}/api/training/submit-exam`, { method: 'POST', headers, body: JSON.stringify(body) });
      }

      setResult({ score: finalScore, total: questions.length, correct, wrong, unattempted, reviewData });
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      setError("Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  // Views
  if (loading) return <div className="p-20 text-center font-black animate-pulse">Initializing Exam...</div>;
  if (error) return <div className="p-20 text-center text-red-600 font-bold bg-red-50 m-10 rounded-3xl">{error}</div>;

  if (!weekId && questions.length === 0 && !isGenerating) {
    return (
      <div className="max-w-4xl mx-auto p-10 space-y-10">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black text-slate-900">Custom PG Exam</h2>
          <p className="text-slate-500 font-medium">Configure your AI-powered training session.</p>
        </div>
        <div className="bg-white p-10 rounded-[40px] shadow-3xl space-y-8 border border-slate-100">
          <input type="text" placeholder="Subject" className="w-full bg-slate-50 p-4 rounded-2xl border-2 font-bold" value={subject} onChange={e => setSubject(e.target.value)} />
          <input type="text" placeholder="Topic" className="w-full bg-slate-50 p-4 rounded-2xl border-2 font-bold" value={topic} onChange={e => setTopic(e.target.value)} />
          <select className="w-full bg-slate-50 p-4 rounded-2xl border-2 font-bold" value={questionCount} onChange={e => setQuestionCount(parseInt(e.target.value))}>
            <option value={10}>10 Questions</option>
            <option value={20}>20 Questions</option>
            <option value={30}>30 Questions</option>
          </select>
          <button onClick={handleGenerateAIQuiz} className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700">Start Session</button>
        </div>
      </div>
    );
  }

  if (isGenerating) return <div className="p-20 text-center font-black animate-pulse">AI is crafting your exam...</div>;

  if (isSubmitted && result) {
     navigate(`/results/${weekId || 'custom'}`);
     return null;
  }

  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100 gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900">{weekId ? `Training: ${weekId}` : 'Custom AI Session'}</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Question {currentQuestionIndex + 1} of {questions.length}</p>
          </div>
          <div className={`px-8 py-4 rounded-3xl border-2 flex flex-col items-center min-w-[160px] ${timeLeft < 300 ? 'bg-red-50 border-red-500 animate-pulse' : 'bg-indigo-50 border-indigo-200'}`}>
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1"><FaClock className="inline mr-1"/> Timer</p>
            <p className={`text-3xl font-black ${timeLeft < 300 ? 'text-red-600' : 'text-indigo-600'}`}>{formatTime(timeLeft)}</p>
          </div>
        </div>

        <div className="bg-white rounded-[48px] shadow-3xl overflow-hidden border border-slate-100 flex flex-col min-h-[500px]">
          <div className="h-3 bg-slate-100 w-full">
            <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}></div>
          </div>
          <div className="p-10 md:p-16 flex-grow">
            <h3 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight mb-10">{currentQ?.question || currentQ?.questionText}</h3>
            <div className="grid grid-cols-1 gap-4">
              {currentQ?.options.map((opt, idx) => (
                <button key={idx} onClick={() => setUserAnswers({ ...userAnswers, [currentQuestionIndex]: opt })} className={`p-6 rounded-3xl text-left border-2 flex items-center gap-6 transition-all ${userAnswers[currentQuestionIndex] === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white border-slate-100 hover:border-indigo-200'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${userAnswers[currentQuestionIndex] === opt ? 'bg-white/20' : 'bg-slate-50 text-slate-400'}`}>{String.fromCharCode(65 + idx)}</div>
                  <span className="text-lg font-bold">{opt}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="p-10 bg-slate-50/50 border-t flex justify-between items-center">
            <button disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(prev => prev - 1)} className="px-8 py-4 rounded-2xl font-black text-slate-400 hover:bg-slate-200 disabled:opacity-20 uppercase text-xs tracking-widest"><FaChevronLeft className="inline mr-2"/> Previous</button>
            {currentQuestionIndex === (questions.length - 1) ? (
              <button onClick={handleSubmit} className="px-12 py-5 bg-green-600 text-white font-black rounded-3xl hover:bg-green-700 shadow-xl uppercase text-sm tracking-widest">Finish Exam</button>
            ) : (
              <button onClick={() => setCurrentQuestionIndex(prev => prev + 1)} className="px-12 py-5 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700 shadow-xl uppercase text-sm tracking-widest">Next <FaChevronRight className="inline ml-2"/></button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuizPage;
