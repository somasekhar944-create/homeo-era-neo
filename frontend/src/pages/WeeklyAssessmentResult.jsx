import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaArchive, FaBrain, FaCheckCircle, FaTimesCircle, FaMinusCircle } from 'react-icons/fa';

function WeeklyAssessmentResult() {
  const { examId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingExplanations, setLoadingExplanations] = useState({});

  useEffect(() => {
    fetchResult();
  }, [examId]);

  const fetchResult = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/training/results/${examId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Result not found.");
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToVault = async (q) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user/vault/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          question: q.question || q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer || q.answer,
          explanation: q.explanation,
          originalQuestionId: q.questionId
        })
      });
      if (response.ok) alert("Added to Vault!");
      else {
          const d = await response.json();
          alert(d.message || "Failed.");
      }
    } catch (err) {
      alert("Error.");
    }
  };

  const handleFetchExplanation = async (questionId) => {
    try {
      setLoadingExplanations(prev => ({ ...prev, [questionId]: true }));
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/training/explanation/${questionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setResult(prev => ({
          ...prev,
          questionsAttempted: prev.questionsAttempted.map(q => 
            q.questionId === questionId ? { ...q, explanation: data.explanation } : q
          )
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExplanations(prev => ({ ...prev, [questionId]: false }));
    }
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse">Loading Results...</div>;
  if (error) return <div className="p-20 text-center text-red-600 font-bold">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <Link to="/pg-training" className="flex items-center gap-2 text-indigo-600 font-black uppercase text-xs tracking-widest hover:translate-x-2 transition-transform">
          <FaArrowLeft /> Back to Training
        </Link>

        {result && (
          <>
            {/* Header Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-indigo-600 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-center">
                 <div className="relative z-10 space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Master Performance Scale</p>
                    <div className="flex items-baseline gap-4">
                        <h1 className="text-8xl font-black">{result.score}</h1>
                        <span className="text-3xl font-bold opacity-40">/ {result.totalQuestions * 4}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/10 p-4 rounded-3xl border border-white/10">
                            <p className="text-[10px] font-black opacity-60 uppercase mb-1">Correct</p>
                            <p className="text-2xl font-black text-green-300">{result.correctAnswers}</p>
                        </div>
                        <div className="bg-white/10 p-4 rounded-3xl border border-white/10">
                            <p className="text-[10px] font-black opacity-60 uppercase mb-1">Wrong</p>
                            <p className="text-2xl font-black text-red-300">{result.wrongAnswers}</p>
                        </div>
                        <div className="bg-white/10 p-4 rounded-3xl border border-white/10">
                            <p className="text-[10px] font-black opacity-60 uppercase mb-1">Skipped</p>
                            <p className="text-2xl font-black opacity-80">{result.unattempted}</p>
                        </div>
                        <div className="bg-red-500/20 p-4 rounded-3xl border border-red-500/20">
                            <p className="text-[10px] font-black text-red-200 uppercase mb-1">Negative</p>
                            <p className="text-2xl font-black text-red-100">-{result.wrongAnswers * 1}</p>
                        </div>
                    </div>
                 </div>
                 <div className="absolute top-0 right-0 p-10">
                    <div className="bg-white text-indigo-600 px-6 py-3 rounded-full font-black shadow-xl">
                        Rank #{result.rank || 'N/A'}
                    </div>
                 </div>
              </div>

              <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl flex flex-col justify-between">
                <h3 className="text-xl font-black italic mb-8 border-b border-white/10 pb-4">Subject Strength</h3>
                <div className="space-y-6">
                    {result.subjectAnalysis && result.subjectAnalysis.map((sub, i) => (
                        <div key={i} className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <span>{sub.subject}</span>
                                <span className="text-indigo-400">{sub.percentage.toFixed(0)}%</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-1000 ${sub.percentage > 70 ? 'bg-green-500' : sub.percentage > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${sub.percentage}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Question Review */}
            <div className="space-y-6">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Mentor's Review</h2>
                {result.questionsAttempted && result.questionsAttempted.map((q, i) => (
                    <div key={i} className={`p-8 rounded-[40px] border-l-[12px] bg-white shadow-xl transition-all ${q.isCorrect ? 'border-green-500' : q.userAnswer ? 'border-red-500' : 'border-slate-300'}`}>
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex gap-4 items-center">
                                <span className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 border border-slate-100">Q{i+1}</span>
                                <button onClick={() => handleAddToVault(q)} className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-5 py-2 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-indigo-100 transition-colors">
                                    <FaArchive /> Add to Vault
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                {q.isCorrect ? <FaCheckCircle className="text-green-500 text-3xl"/> : q.userAnswer ? <FaTimesCircle className="text-red-500 text-3xl"/> : <FaMinusCircle className="text-slate-300 text-3xl"/>}
                            </div>
                        </div>

                        <h3 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight mb-8">{q.question || q.questionText || "Question text not found."}</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            <div className={`p-5 rounded-3xl border-2 font-bold ${q.isCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                <p className="text-[10px] uppercase opacity-60 mb-1">Correct Answer</p>
                                {q.correctAnswer || q.answer || "Not found"}
                            </div>
                            {q.userAnswer && !q.isCorrect && (
                                <div className="p-5 rounded-3xl border-2 border-red-200 bg-red-50 text-red-800 font-bold">
                                    <p className="text-[10px] uppercase opacity-60 mb-1">Your Answer</p>
                                    {q.userAnswer}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 relative">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-3 flex items-center gap-2">
                                <FaBrain /> Mentor's Insight
                            </p>
                            <p className="text-slate-700 leading-relaxed italic">{q.explanation || "No explanation recorded."}</p>
                            {(!q.explanation || q.explanation.includes("standard")) && (
                                <button onClick={() => handleFetchExplanation(q.questionId)} disabled={loadingExplanations[q.questionId]} className="mt-4 text-[10px] font-black text-indigo-600 uppercase underline">
                                    {loadingExplanations[q.questionId] ? 'Generating...' : '✨ Upgrade Explanation'}
                                </button>
                            )}
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
