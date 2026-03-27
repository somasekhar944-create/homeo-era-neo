import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaArchive, FaBrain } from 'react-icons/fa';

function WeeklyAssessmentResult() {
  const { examId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingExplanations, setLoadingExplanations] = useState({});

  const handleAddToVault = async (questionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user/vault/add`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ questionId })
      });
      const data = await response.json();
      if (response.ok) {
        alert("Added to Vault!");
      } else {
        alert(data.message || "Failed to add to vault.");
      }
    } catch (err) {
      console.error("Vault Error:", err);
      alert("Error connecting to vault.");
    }
  };

  const handleFetchExplanation = async (questionId) => {
    try {
      setLoadingExplanations(prev => ({ ...prev, [questionId]: true }));
      const token = localStorage.getItem('token');
      const response = await fetch(`import.meta.env.VITE_API_URL/api/training/explanation/${questionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        // Update the local result state with the new explanation
        setResult(prev => ({
          ...prev,
          questionsAttempted: prev.questionsAttempted.map(q => 
            q.questionId === questionId ? { ...q, explanation: data.explanation } : q
          )
        }));
      } else {
        alert(data.message || "Failed to fetch explanation.");
      }
    } catch (err) {
      console.error("Explanation Error:", err);
      alert("Error connecting to AI service.");
    } finally {
      setLoadingExplanations(prev => ({ ...prev, [questionId]: false }));
    }
  };

  useEffect(() => {
    const fetchResult = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`import.meta.env.VITE_API_URL/api/training/results/${examId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setResult(data);
      } catch (err) {
        console.error("Error fetching result:", err);
        setError("Failed to load exam results.");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [examId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-8" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-[40px] shadow-lg">
        <Link to="/pg-training" className="text-blue-600 hover:underline flex items-center mb-4">
          <FaArrowLeft className="mr-2" /> Back to PG Training
        </Link>
        <h1 className="text-4xl font-black text-gray-900 mb-10 tracking-tighter uppercase italic">Results for {examId}</h1>
        
        {result ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Final Score</p>
                <p className="text-5xl font-black text-indigo-900">{result.score}</p>
                <p className="text-xs font-bold text-indigo-500 mt-2">Marking: +4 for Correct, -1 for Wrong</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Correct</p>
                  <p className="text-2xl font-black text-green-600">{result.correctAnswers}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Wrong</p>
                  <p className="text-2xl font-black text-red-600">{result.wrongAnswers}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Unattempted</p>
                  <p className="text-2xl font-black text-gray-400">{result.unattempted}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Total</p>
                  <p className="text-2xl font-black text-gray-800">{result.totalQuestions}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8">
              <h2 className="text-2xl font-black text-gray-900 mb-6 border-b-4 border-gray-50 pb-2">Question-by-Question Review</h2>
              {/* Display questions and user's answers/correct answers */}
              {result.questionsAttempted && result.questionsAttempted.map((q, index) => (
                <div key={index} className={`mb-8 p-8 rounded-[32px] border-l-8 transition-all ${q.isCorrect ? 'bg-green-50 border-green-500' : q.userAnswer ? 'bg-red-50 border-red-500' : 'bg-gray-50 border-gray-300'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4 items-center">
                      <span className="text-[10px] font-black px-3 py-1 bg-white text-gray-500 rounded-full border border-gray-100 uppercase">Q{index + 1}</span>
                      <button 
                        onClick={() => handleAddToVault(q.questionId)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-white px-4 py-1 rounded-full border border-indigo-100 hover:bg-indigo-50 transition-all"
                      >
                        <FaArchive /> Add to Vault
                      </button>
                    </div>
                    <span className="text-[10px] font-black px-3 py-1 bg-white text-indigo-500 rounded-full border border-indigo-100 uppercase">{q.topic || 'General'}</span>
                  </div>
                  <p className="font-bold text-gray-800 text-lg mb-6 leading-relaxed">{q.question}</p>
                  
                  <div className="space-y-3 mb-6">
                    <div className={`p-4 rounded-2xl text-sm font-bold border-2 ${q.isCorrect ? 'bg-green-100 border-green-500 text-green-900' : 'bg-white border-gray-100 text-gray-400'}`}>
                      <span className="opacity-50 mr-2">Correct Answer:</span> {q.correctAnswer}
                    </div>
                    {q.userAnswer && !q.isCorrect && (
                      <div className="p-4 rounded-2xl text-sm font-bold border-2 bg-red-100 border-red-500 text-red-900">
                        <span className="opacity-50 mr-2">Your Answer:</span> {q.userAnswer}
                      </div>
                    )}
                    {!q.userAnswer && (
                      <div className="p-4 rounded-2xl text-sm font-bold border-2 bg-gray-100 border-gray-200 text-gray-500 italic">
                        Not Attempted
                      </div>
                    )}
                  </div>

                  <div className="bg-white/60 p-6 rounded-2xl border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                       <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Mentor's Insight</p>
                       {(q.explanation && (q.explanation.includes("standard textbooks") || q.explanation.includes("Explanation not found"))) && (
                          <button 
                            onClick={() => handleFetchExplanation(q.questionId)}
                            disabled={loadingExplanations[q.questionId]}
                            className="text-[10px] font-bold text-indigo-600 hover:underline disabled:opacity-50"
                          >
                            {loadingExplanations[q.questionId] ? "Generating..." : "✨ Upgrade to AI Insight"}
                          </button>
                        )}
                    </div>
                    <p className="text-slate-700 leading-relaxed text-sm italic whitespace-pre-wrap">{q.explanation || "Detailed clinical reasoning is being generated. Click 'Upgrade' to see it."}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 font-bold text-xl uppercase tracking-widest">No results found for this exam.</p>
          </div>
        )}

      </div>
    </div>
  );
}

export default WeeklyAssessmentResult;

