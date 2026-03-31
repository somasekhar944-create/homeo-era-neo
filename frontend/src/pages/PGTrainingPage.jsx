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
  const [user, setUser] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [syllabusRes, userRes, perfRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/training/syllabus`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/user/profile`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/analytics/performance`, { headers })
      ]);

      if (syllabusRes.ok) {
        const data = await syllabusRes.json();
        setSyllabus(Array.isArray(data) ? data.sort((a, b) => a.week - b.week) : []);
      }

      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
        if (!userData.preferredExamDay) setShowDayPicker(true);
      }

      if (perfRes.ok) {
        const perfData = await perfRes.json();
        setUserSchedule(perfData.trainingSchedule || []);
        setCompletedWeeks(perfData.completedWeeks || []);
      }
    } catch (err) {
      setError("Failed to load training dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const handleDaySelect = async (day) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL}/api/training/update-exam-day`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ preferredDay: day })
      });
      setShowDayPicker(false);
      fetchInitialData();
    } catch (err) { alert("Error saving day."); }
  };

  if (loading) return <div className="flex justify-center p-24"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-700"></div></div>;

  const isAdmin = user?.role === 'admin' || user?.phone === '9493649788';

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen">
      {showDayPicker && <ExamDaySelectionPopup onSelect={handleDaySelect} />}
      
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic">PG Entrance Training</h1>
            <p className="text-slate-500 font-bold mt-2">6-Month Cumulative Revision Mastery Path</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 text-center">
              <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Your Role</p>
              <p className="text-sm font-black text-indigo-600 uppercase">{user?.role || 'Student'}</p>
            </div>
            {isAdmin && (
              <div className="bg-amber-50 px-6 py-3 rounded-2xl shadow-sm border border-amber-100 text-center">
                <p className="text-[8px] font-black uppercase text-amber-500 mb-1">Admin Mode</p>
                <p className="text-sm font-black text-amber-700 uppercase">All Unlocked</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {syllabus.length > 0 ? syllabus.map((item) => {
            const isMonthly = item.week % 4 === 0;
            const scheduledInfo = userSchedule.find(s => s.week === item.week);
            const unlockDate = scheduledInfo ? new Date(scheduledInfo.examDate) : null;
            const isCompleted = completedWeeks.includes(item.week);
            const isLocked = isAdmin ? false : (item.week === 1 ? false : (!unlockDate || new Date() < unlockDate));

            return (
              <div key={item.week} className={`bg-white rounded-[40px] border-2 transition-all duration-300 overflow-hidden flex flex-col ${isLocked ? 'opacity-60 grayscale border-slate-100' : 'hover:shadow-2xl hover:-translate-y-2 border-slate-50 shadow-xl shadow-slate-200/50'}`}>
                <div className={`p-8 flex-grow space-y-6 ${isMonthly ? 'bg-orange-50/30' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isMonthly ? 'bg-orange-500 text-white' : 'bg-indigo-600 text-white'}`}>
                      Week {item.week} {isMonthly && '• Grand Mock'}
                    </span>
                    {!isLocked && <span className="text-[10px] font-black text-green-500 uppercase">Available</span>}
                    {isLocked && <span className="text-[10px] font-black text-slate-400 uppercase">Locked</span>}
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight min-h-[56px] line-clamp-2">
                      {item.materia_medica?.join(", ") || "Revision Week"}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-2 italic">Cumulative Topics up to Week {item.week}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-3xl space-y-3 border border-slate-100">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">Total Questions</span>
                      <span className="text-slate-900">{isMonthly ? '100' : '50'} Qns</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">Ratio (PYQ / AI)</span>
                      <span className="text-slate-900">{isMonthly ? '40 / 60' : '20 / 30'}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Syllabus Highlight</p>
                     <p className="text-xs font-bold text-slate-700">{item.organon || 'Review sessions'}</p>
                  </div>
                </div>

                <div className="p-8 pt-0">
                  <button 
                    disabled={isLocked}
                    onClick={() => navigate(isCompleted ? `/results/week-${item.week}` : `/quiz/week-${item.week}`)}
                    className={`w-full py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-xs transition-all ${isCompleted ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100' : isLocked ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-black shadow-xl shadow-slate-300'}`}
                  >
                    {isCompleted ? 'Review Result' : isLocked ? `Unlocks ${unlockDate?.toLocaleDateString() || 'Soon'}` : 'Start Exam'}
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200">
               <p className="text-slate-400 font-black uppercase tracking-widest">No Exams Found. Contact Admin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PGTrainingPage;
