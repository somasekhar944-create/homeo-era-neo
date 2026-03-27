import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaTrash, FaPlay, FaCheckCircle, FaExclamationCircle, FaArchive } from 'react-icons/fa';

function RevisionVaultPage() {
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revisionMode, setRevisionMode] = useState(false);
  const [currentRevIndex, setCurrentRevIndex] = useState(0);
  const [revAnswers, setRevAnswers] = useState({});
  const [showRemovalSuggestion, setShowRemovalSuggestion] = useState(null); // questionId to suggest removal
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user/vault`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Vault Data:', data);
        setBookmarkedQuestions(data);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching vault:", err);
      setLoading(false);
    }
  };

  const removeBookmark = async (questionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`import.meta.env.VITE_API_URL/api/user/vault/${questionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setBookmarkedQuestions(prev => prev.filter(q => q._id !== questionId));
        setShowRemovalSuggestion(null);
      }
    } catch (err) {
      console.error("Error removing bookmark:", err);
    }
  };

  const updateProgress = async (questionId, isCorrect) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/training/update-revision-progress`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ questionId, isCorrect })
      });
      if (response.ok) {
        const data = await response.json();
        // Smart Removal Logic: If correctly answered twice (or more), suggest removal
        if (isCorrect && data.correctCount >= 2) {
          setShowRemovalSuggestion(questionId);
        }
      }
    } catch (err) {
      console.error("Error updating progress:", err);
    }
  };

  const [loadingExplanations, setLoadingExplanations] = useState({});

  const handleFetchExplanation = async (questionId) => {
    try {
      setLoadingExplanations(prev => ({ ...prev, [questionId]: true }));
      const token = localStorage.getItem('token');
      const response = await fetch(`import.meta.env.VITE_API_URL/api/training/explanation/${questionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        setBookmarkedQuestions(prev => prev.map(q => 
          q._id === questionId ? { ...q, explanation: data.explanation } : q
        ));
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

  const startRevision = () => {
    if (bookmarkedQuestions.length === 0) return;
    setRevisionMode(true);
    setCurrentRevIndex(0);
    setRevAnswers({});
  };

  const handleRevAnswer = (option) => {
    const question = bookmarkedQuestions[currentRevIndex];
    const isCorrect = option === question.answer;
    setRevAnswers({ ...revAnswers, [currentRevIndex]: { selected: option, isCorrect } });
    
    updateProgress(question._id, isCorrect);
  };

  const groupedQuestions = bookmarkedQuestions.reduce((acc, q) => {
    const subject = q.subject || "General";
    if (!acc[subject]) acc[subject] = [];
    acc[subject].push(q);
    return acc;
  }, {});

  if (loading) return <div className="p-10 text-center font-bold">Loading your Vault...</div>;

  if (revisionMode) {
    const q = bookmarkedQuestions[currentRevIndex];
    const answerData = revAnswers[currentRevIndex];

    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fadeIn">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-gray-900 italic uppercase tracking-tighter">Revision Mode</h2>
          <button 
            onClick={() => { setRevisionMode(false); fetchBookmarks(); }} 
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300"
          >
            Exit Revision
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="h-2 bg-amber-500 w-full">
            <div 
              className="h-full bg-amber-600 transition-all duration-300" 
              style={{ width: `${((currentRevIndex + 1) / bookmarkedQuestions.length) * 100}%` }}
            ></div>
          </div>
          
          <div className="p-8">
            <div className="mb-6 flex justify-between items-center">
               <span className="text-[10px] font-black px-3 py-1 bg-amber-100 text-amber-700 rounded-full uppercase">
                Question {currentRevIndex + 1} of {bookmarkedQuestions.length}
              </span>
              <span className="text-[10px] font-black text-gray-400 uppercase">{q.subject}</span>
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-8">{q.question}</h3>

            <div className="grid gap-3">
              {q.options.map((opt, idx) => {
                const isSelected = answerData?.selected === opt;
                const isCorrect = opt === q.answer;
                let btnClass = "bg-white border-gray-100 text-gray-700 hover:border-amber-300";
                
                if (answerData) {
                  if (isCorrect) btnClass = "bg-green-100 border-green-500 text-green-800";
                  else if (isSelected) btnClass = "bg-red-100 border-red-500 text-red-800";
                } else if (isSelected) {
                  btnClass = "bg-amber-600 border-amber-600 text-white";
                }

                return (
                  <button
                    key={idx}
                    disabled={!!answerData}
                    onClick={() => handleRevAnswer(opt)}
                    className={`p-4 rounded-xl text-left border-2 transition-all flex items-center gap-3 ${btnClass}`}
                  >
                    <span className="opacity-50 font-bold">{String.fromCharCode(65 + idx)}.</span>
                    <span className="font-medium">{opt}</span>
                  </button>
                );
              })}
            </div>

            {answerData && (
              <div className="mt-8 p-6 bg-indigo-50/80 rounded-2xl border border-indigo-100 animate-slideUp">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-600 text-white p-1 rounded-lg text-[10px]">✨</span>
                    <h4 className="font-black text-indigo-900 uppercase tracking-wider text-[10px]">Mentor's Insight</h4>
                  </div>
                  {(!q.explanation || q.explanation.includes("standard textbooks")) && (
                    <button 
                      onClick={() => handleFetchExplanation(q._id)}
                      disabled={loadingExplanations[q._id]}
                      className="text-[10px] font-bold text-indigo-600 hover:underline disabled:opacity-50"
                    >
                      {loadingExplanations[q._id] ? "Generating..." : "✨ Upgrade to AI Insight"}
                    </button>
                  )}
                </div>
                <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                  {q.explanation || "No detailed explanation available yet. Click 'Upgrade' to generate one."}
                </p>
                
                {showRemovalSuggestion === q._id && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3 text-green-700">
                      <FaCheckCircle className="text-xl" />
                      <p className="text-xs font-bold">You've mastered this! Remove from vault?</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => removeBookmark(q._id)}
                        className="px-3 py-1 bg-green-600 text-white text-[10px] font-black rounded-lg uppercase hover:bg-green-700"
                      >
                        Yes, Remove
                      </button>
                      <button 
                         onClick={() => setShowRemovalSuggestion(null)}
                         className="px-3 py-1 bg-gray-200 text-gray-600 text-[10px] font-black rounded-lg uppercase"
                      >
                        Keep it
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-6 bg-gray-50 border-t flex justify-between">
             <button
              disabled={currentRevIndex === 0}
              onClick={() => { setCurrentRevIndex(prev => prev - 1); setShowRemovalSuggestion(null); }}
              className="px-6 py-2 rounded-xl font-bold text-gray-400 disabled:opacity-30"
            >
              Previous
            </button>
            {currentRevIndex < bookmarkedQuestions.length - 1 ? (
              <button
                onClick={() => { setCurrentRevIndex(prev => prev + 1); setShowRemovalSuggestion(null); }}
                className="px-8 py-2 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-100"
              >
                Next Question
              </button>
            ) : (
              <button
                onClick={() => { setRevisionMode(false); fetchBookmarks(); }}
                className="px-8 py-2 bg-gray-900 text-white font-bold rounded-xl hover:bg-black shadow-lg shadow-gray-200"
              >
                Finish Revision
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic uppercase flex items-center gap-4">
            <FaArchive className="text-amber-500" />
            Revision Vault
          </h1>
          <p className="text-gray-500 font-medium mt-2">Strengthen your weak areas by revisiting bookmarked questions.</p>
        </div>
        <button
          disabled={bookmarkedQuestions.length === 0}
          onClick={startRevision}
          className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black rounded-2xl shadow-xl shadow-amber-100 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
        >
          <FaPlay />
          START REVISION TEST
        </button>
      </div>

      {bookmarkedQuestions.length === 0 ? (
        <div className="bg-white p-20 rounded-[40px] text-center shadow-xl border-2 border-dashed border-gray-200">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaBook className="text-4xl text-gray-200" />
          </div>
          <h3 className="text-xl font-bold text-gray-400">Your vault is empty.</h3>
          <p className="text-gray-400 mt-2">Bookmark tough questions during your quizzes to see them here.</p>
          <button 
             onClick={() => navigate('/pg-training')}
             className="mt-8 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl"
          >
            Go to Training
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Object.keys(groupedQuestions).map(subject => (
            <div key={subject} className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                <h2 className="text-lg font-black text-gray-800 uppercase tracking-widest">{subject}</h2>
                <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-3 py-1 rounded-full">
                  {groupedQuestions[subject].length} QUESTIONS
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {groupedQuestions[subject].map((q, idx) => (
                  <div key={idx} className="p-6 hover:bg-slate-50 transition-colors group">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="font-bold text-gray-700 line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">{q.question}</p>
                        <div className="flex gap-2">
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">
                            Added: {new Date(q.addedAt).toLocaleDateString()}
                          </span>
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">
                            Mastery: {q.correctCount}/2
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeBookmark(q._id)}
                        className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Remove from Vault"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RevisionVaultPage;

