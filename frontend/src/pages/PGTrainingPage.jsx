import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ExamDaySelectionPopup from '../components/ExamDaySelectionPopup.jsx';

function PGTrainingPage() {
  const [syllabus, setSyllabus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [userSchedule, setUserSchedule] = useState([]);
  const [completedWeeks, setCompletedWeeks] = useState([]);
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : { role: "student" };
  }); // User state for role and other info

  const navigate = useNavigate();

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Force show popup if preferredExamDay is missing after data is loaded
  useEffect(() => {
    if (!loading && user && !user.preferredExamDay) {
      setShowDayPicker(true);
    }
  }, [loading, user]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [syllabusRes, userRes, perfRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/training/syllabus`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/user/profile`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/analytics/performance`, { headers })
      ]);

      if (syllabusRes.ok) {
        const data = await syllabusRes.json();
        setSyllabus(data.sort((a, b) => a.week - b.week));
      }

      if (userRes.ok) {
        const userData = await userRes.json();
        // Correctly store full user data to check for preferredExamDay
        setUser(userData);
        if (!userData.preferredExamDay) {
          setShowDayPicker(true);
        } else {
          setShowDayPicker(false);
        }
      }

      if (perfRes.ok) {
        const perfData = await perfRes.json();
        setUserSchedule(perfData.trainingSchedule || []);
        setCompletedWeeks(perfData.completedWeeks || []);
      }
    } catch (err) {
      setError("Failed to load training data.");
    } finally {
      setLoading(false);
    }
  };

  const handleDaySelect = async (day) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/training/update-exam-day`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ preferredDay: day })
      });
      const data = await response.json();
      
      if (response.ok || response.status === 403) {
        setShowDayPicker(false);
        fetchInitialData();
      } else {
        alert(`Error: ${data.message || "Failed to save day."}`);
      }
    } catch (err) {
      alert(`Connection Error: ${err.message}`);
    }
  };

  const handleStartExam = (weekId, isCompleted) => {
    if (isCompleted) {
      navigate(`/results/${weekId}`);
    } else {
      localStorage.removeItem(`exam_persistence_${weekId}`);
      navigate(`/quiz/${weekId}`);
    }
  };

  const nextExam = userSchedule.length > 0 
    ? userSchedule.find(s => {
        const examDate = new Date(s.examDate);
        return examDate >= new Date().setHours(0,0,0,0) && !completedWeeks.includes(s.week);
      }) 
    : null;

  if (loading) return (
    <div className="flex justify-center p-24">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-700"></div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {showDayPicker && <ExamDaySelectionPopup onSelect={handleDaySelect} />}
      
      {/* Next Exam Highlight */}
      {nextExam ? (
        <div className="mb-10 bg-gradient-to-r from-indigo-600 to-blue-700 text-white p-8 rounded-[40px] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 animate-fadeIn relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20"></div>
          <div className="flex items-center gap-8 relative z-10">
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-4xl shadow-inner backdrop-blur-md border border-white/20">
              🎯
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mb-2">Targeting Excellence</p>
              <h2 className="text-3xl font-black italic tracking-tight">
                Week {nextExam.week}: {new Date(nextExam.examDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h2>
              <p className="text-blue-100 font-medium mt-1">Stay consistent. Your hard work will pay off, Doctor.</p>
            </div>
          </div>
          <div className="bg-white text-indigo-900 px-8 py-4 rounded-[24px] text-center shadow-xl relative z-10 border-b-4 border-indigo-200">
             <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Status</p>
             <p className="text-xl font-black">
               {new Date(nextExam.examDate).toDateString() === new Date().toDateString() ? "LIVE NOW!" : "Next Test Slot"}
             </p>
          </div>
        </div>
      ) : (
        !showDayPicker && (
          <div className="mb-10 bg-white p-8 rounded-[40px] shadow-lg border border-gray-100 text-center animate-fadeIn">
            <p className="text-gray-400 font-bold italic">Your 6-month roadmap is ready. Good luck with your preparation!</p>
          </div>
        )
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-blue-900">PG Entrance Training</h2>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <p className="text-gray-500">6-Month Comprehensive Preparation Path</p>
            {nextExam ? (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold border border-blue-200">
                Target Exam: {new Date(nextExam.examDate).toLocaleDateString()}
              </span>
            ) : (
              <button 
                onClick={() => setShowDayPicker(true)}
                className="px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md active:scale-95"
              >
                Set Exam Date
              </button>
            )}
            <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium">Role: {user.role}</span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-600"></div>
              <span className="text-sm font-medium text-gray-600">Weekly Exam</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-sm font-medium text-gray-600">Monthly Grand Mock</span>
           </div>
        </div>
      </div>
      
      {error ? (
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 shadow-sm max-w-2xl mx-auto text-center">
          <p className="font-bold text-lg mb-2">Oops! Something went wrong.</p>
          <p>{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {syllabus.map((item) => {
            const isMonthlyMock = item.week % 4 === 0;
            const cardColor = isMonthlyMock ? 'border-orange-500 bg-orange-50/30' : 'border-blue-600 bg-white';
            const badgeColor = isMonthlyMock ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800';

            // --- EXAM ACCESS LOGIC (HARD-FIXED) ---
            const scheduledInfo = userSchedule.find(s => s.week === item.week);
            let unlockDate = scheduledInfo ? scheduledInfo.examDate : null;
            const isCompleted = completedWeeks.includes(item.week);
            
            // Final Logic: Locked if not scheduled OR date is in the future (Admin bypass)
            let isLocked = user.role === 'admin' ? false : (!unlockDate || new Date() < new Date(unlockDate));
            
            // Allow review for completed weeks even for students
            if (user.role !== 'admin' && isCompleted) isLocked = false;

            console.log(`Week ${item.week} - Role: ${user.role}, Today:`, new Date(), 'UnlockDate:', unlockDate, 'Is Locked:', isLocked);

            return (
              <div key={item._id} className={`relative rounded-2xl shadow-md border-t-8 ${cardColor} overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${isLocked ? 'opacity-75 grayscale-[0.8] cursor-not-allowed' : ''}`}>
                {isMonthlyMock && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-tighter">
                      Grand Test
                    </div>
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className={`${badgeColor} text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider`}>
                      Week {item.week}
                    </span>
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">
                      {unlockDate && new Date(unlockDate).getFullYear() > 1970 
                        ? new Date(unlockDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()
                        : `Phase ${Math.ceil(item.week / 8)} | Not Scheduled`}
                    </span>
                  </div>
                  
                  <h3 className={`font-black text-xl mb-3 h-14 line-clamp-2 ${isMonthlyMock ? 'text-orange-900' : 'text-gray-800'}`}>
                    {item.materia_medica && item.materia_medica.length > 0 
                      ? item.materia_medica.join(', ') 
                      : (isMonthlyMock ? 'Monthly Cumulative Review' : 'Revision & Consolidation')}
                  </h3>
                  
                  <div className="space-y-3 mb-6 bg-white/50 p-3 rounded-lg border border-gray-100">
                    <div className="flex items-start">
                      <span className="text-[10px] font-black text-gray-400 mr-3 mt-1 w-16 uppercase">Organon</span>
                      <p className="text-sm text-gray-700 font-medium leading-tight">{item.organon}</p>
                    </div>
                    <div className="flex items-start">
                      <span className="text-[10px] font-black text-gray-400 mr-3 mt-1 w-16 uppercase">Allied</span>
                      <p className="text-sm text-gray-600 italic">
                        {item.allied_subjects ? Object.values(item.allied_subjects).join(', ') : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    {isLocked ? (
                      <div className="bg-slate-100 p-3 rounded-xl border border-dashed border-slate-300 text-center flex items-center justify-center gap-2">
                        <span className="text-lg">🔒</span>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-4">
                          {unlockDate && new Date(unlockDate).getFullYear() > 1970 
                            ? `Scheduled for ${new Date(unlockDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}`
                            : 'Date Not Scheduled'}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 h-12 overflow-hidden">
                        {item.keywords && item.keywords.slice(0, 5).map((kw, i) => (
                          <span key={i} className="bg-white text-gray-500 text-[10px] px-2.5 py-1 rounded-md border border-gray-200 font-medium">
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    disabled={isLocked}
                    onClick={() => handleStartExam(`week-${item.week}`, isCompleted)}
                    className={`w-full py-4 rounded-[20px] transition-all duration-300 text-sm font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 group ${isCompleted ? 'bg-indigo-50 text-indigo-600 border-2 border-indigo-100 hover:bg-indigo-100' : !isLocked ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-200 animate-bounce-subtle' : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'}`}
                  >
                    {isCompleted ? (
                      <span>Review Performance</span>
                    ) : !isLocked ? (
                      <>
                        <span>Take Test Now</span>
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <span className="text-lg">🔒</span>
                        <span>Locked</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PGTrainingPage;

