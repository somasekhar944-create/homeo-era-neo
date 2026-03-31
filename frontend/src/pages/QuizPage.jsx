import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaBrain, FaCheckCircle, FaTimesCircle, FaChevronLeft, FaChevronRight, FaClock } from 'react-icons/fa';

function QuizPage() {
  const { weekId } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes
  const timerRef = useRef(null);

  useEffect(() => {
    if (weekId) fetchExam();
    else setError("Invalid Access");
  }, [weekId]);

  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted && questions.length > 0) {
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
  }, [timeLeft, isSubmitted, questions.length]);

  const fetchExam = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const weekNumber = parseInt(weekId.replace('week-', '')) || 1;

      // Access Rules
      const userRes = await fetch(`${import.meta.env.VITE_API_URL}/api/user/profile`, { headers });
      const user = await userRes.json();
      const isAdmin = user.role === 'admin' || user.phone === '9493649788';
      
      if (!isAdmin && weekNumber !== 1) {
        const perfRes = await fetch(`${import.meta.env.VITE_API_URL}/api/analytics/performance`, { headers });
        const perfData = await perfRes.json();
        const weekInfo = (perfData.trainingSchedule || []).find(s => s.week === weekNumber);
        const unlockDate = weekInfo ? weekInfo.examDate : null;
        if (unlockDate && new Date() < new Date(unlockDate)) {
           throw new Error(`Locked until ${new Date(unlockDate).toLocaleDateString()}`);
        }
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/training/exam/${weekNumber}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load");
      
      setQuestions(data.examQuestions);
      setTimeLeft(60 * 60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitted) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const weekNumber = parseInt(weekId.replace('week-', '')) || 1;
      
      const body = {
        weekNumber,
        examType: weekNumber % 4 === 0 ? 'monthly' : 'weekly',
        totalQuestions: questions.length,
        timeTaken: 3600 - timeLeft,
        userAnswers: questions.map((q, idx) => ({
          questionId: q._id || q.id,
          answer: userAnswers[idx],
          correctAnswer: q.answer || q.correctAnswer,
          questionText: q.question || q.questionText,
          explanation: q.explanation,
          subject: q.subject,
          topic: q.topic,
          label: q.label
        }))
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/training/submit-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setIsSubmitted(true);
        navigate(`/results/${weekId}`);
      } else {
        throw new Error("Submission Failed");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading && questions.length === 0) return <div className="p-20 text-center font-black">Loading Exam...</div>;
  if (error) return <div className="p-20 text-center text-red-600 font-bold">{error}</div>;

  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6">
        <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Week {weekId.replace('week-', '')} Exam</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Question {currentQuestionIndex + 1} of {questions.length}</p>
          </div>
          <div className={`px-6 py-3 rounded-3xl border-2 flex flex-col items-center ${timeLeft < 300 ? 'bg-red-50 border-red-500 animate-pulse' : 'bg-indigo-50 border-indigo-100'}`}>
            <p className="text-[8px] font-black uppercase text-slate-400">Time Left</p>
            <p className={`text-2xl font-black ${timeLeft < 300 ? 'text-red-600' : 'text-indigo-600'}`}>{formatTime(timeLeft)}</p>
          </div>
        </div>

        <div className="bg-white rounded-[48px] shadow-2xl overflow-hidden border border-slate-100">
          <div className="h-2 bg-slate-100"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}></div></div>
          <div className="p-10 md:p-16">
            <div className="mb-8">
               <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${currentQ?.isAI ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                  {currentQ?.label}
               </span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight mb-10">{currentQ?.question}</h3>
            <div className="grid grid-cols-1 gap-4">
              {currentQ?.options?.map((opt, i) => (
                <button key={i} onClick={() => setUserAnswers({ ...userAnswers, [currentQuestionIndex]: opt })} className={`p-6 rounded-3xl text-left border-2 flex items-center gap-6 transition-all ${userAnswers[currentQuestionIndex] === opt ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 hover:border-indigo-200'}`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${userAnswers[currentQuestionIndex] === opt ? 'bg-white/20' : 'bg-slate-50 text-slate-400'}`}>{String.fromCharCode(65 + i)}</div>
                  <span className="font-bold">{opt}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="p-10 bg-slate-50/50 border-t flex justify-between">
            <button disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(prev => prev - 1)} className="px-8 py-4 font-black text-slate-400 disabled:opacity-20 uppercase text-xs">Previous</button>
            {currentQuestionIndex === questions.length - 1 ? (
              <button onClick={handleSubmit} className="px-12 py-5 bg-green-600 text-white font-black rounded-3xl hover:bg-green-700 shadow-xl uppercase text-sm">Finish Exam</button>
            ) : (
              <button onClick={() => setCurrentQuestionIndex(prev => prev + 1)} className="px-12 py-5 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700 shadow-xl uppercase text-sm">Next</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuizPage;
