import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaArchive, FaBrain, FaCheckCircle, FaTimesCircle, FaMinusCircle } from 'react-icons/fa';

function WeeklyAssessmentResult() {
  const { examId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchResult();
  }, [examId]);

  const fetchResult = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/training/results/${examId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Not Found");
      setResult(await res.json());
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleAddToVault = async (q) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL}/api/user/vault/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          question: q.question, options: q.options, correctAnswer: q.correctAnswer, 
          explanation: q.explanation, originalQuestionId: q.questionId 
        })
      });
      alert("Added!");
    } catch (e) { alert("Error"); }
  };

  if (loading) return <div className="p-20 text-center font-black">Loading Results...</div>;
  if (error) return <div className="p-20 text-center text-red-600 font-bold">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <Link to="/pg-training" className="text-indigo-600 font-black uppercase text-xs tracking-widest flex items-center gap-2"><FaArrowLeft/> Back</Link>

        {result && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-indigo-600 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-4">Exam Performance</p>
                <div className="flex items-baseline gap-4 mb-8">
                  <h1 className="text-8xl font-black">{result.score}</h1>
                  <span className="text-3xl font-bold opacity-40">/ {result.totalQuestions * 4}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/10 p-4 rounded-3xl border border-white/10"><p className="text-[8px] font-black opacity-60 uppercase mb-1">Correct</p><p className="text-2xl font-black text-green-300">{result.correctAnswers}</p></div>
                  <div className="bg-white/10 p-4 rounded-3xl border border-white/10"><p className="text-[8px] font-black opacity-60 uppercase mb-1">Wrong</p><p className="text-2xl font-black text-red-300">{result.wrongAnswers}</p></div>
                  <div className="bg-white/10 p-4 rounded-3xl border border-white/10"><p className="text-[8px] font-black opacity-60 uppercase mb-1">Skipped</p><p className="text-2xl font-black opacity-60">{result.unattempted}</p></div>
                  <div className="bg-red-500/20 p-4 rounded-3xl border border-red-500/10"><p className="text-[8px] font-black text-red-200 uppercase mb-1">Negative</p><p className="text-2xl font-black text-red-100">-{result.wrongAnswers}</p></div>
                </div>
                <div className="absolute top-0 right-0 p-10"><div className="bg-white text-indigo-600 px-6 py-2 rounded-full font-black text-sm shadow-xl">Rank #{result.rank || 'N/A'}</div></div>
              </div>

              <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl">
                <h3 className="text-lg font-black uppercase tracking-widest mb-8 border-b border-white/10 pb-4">Subject Strength</h3>
                <div className="space-y-6">
                  {result.subjectAnalysis?.map((sub, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase text-slate-400"><span>{sub.subject}</span><span>{sub.percentage.toFixed(0)}%</span></div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden"><div className={`h-full rounded-full ${sub.percentage > 70 ? 'bg-green-500' : sub.percentage > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${sub.percentage}%` }}></div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Review Your Answers</h2>
              {result.questionsAttempted?.map((q, i) => (
                <div key={i} className={`p-8 rounded-[40px] border-l-[10px] bg-white shadow-lg transition-all ${q.isCorrect ? 'border-green-500' : q.userAnswer ? 'border-red-500' : 'border-slate-300'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4 items-center">
                      <span className="bg-slate-50 text-slate-400 px-4 py-1 rounded-xl font-black text-xs border border-slate-100">Q{i+1}</span>
                      <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">{q.label}</span>
                      <button onClick={() => handleAddToVault(q)} className="text-indigo-600 hover:text-indigo-800 transition-colors"><FaArchive/></button>
                    </div>
                    {q.isCorrect ? <FaCheckCircle className="text-green-500 text-2xl"/> : q.userAnswer ? <FaTimesCircle className="text-red-500 text-2xl"/> : <FaMinusCircle className="text-slate-300 text-2xl"/>}
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-8">{q.question}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className={`p-4 rounded-2xl border-2 ${q.isCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'bg-slate-50 border-slate-100 text-slate-500'} font-bold text-sm`}>
                      <p className="text-[8px] uppercase opacity-50 mb-1">Correct Answer</p>{q.correctAnswer}
                    </div>
                    {q.userAnswer && !q.isCorrect && (
                      <div className="p-4 rounded-2xl border-2 border-red-100 bg-red-50 text-red-800 font-bold text-sm">
                        <p className="text-[8px] uppercase opacity-50 mb-1">Your Answer</p>{q.userAnswer}
                      </div>
                    )}
                  </div>
                  <div className="bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100/50">
                    <p className="text-[10px] font-black uppercase text-indigo-400 mb-2 flex items-center gap-2"><FaBrain/> Mentor's Insight</p>
                    <p className="text-slate-600 text-sm leading-relaxed italic">{q.explanation || "No explanation available."}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default WeeklyAssessmentResult;
