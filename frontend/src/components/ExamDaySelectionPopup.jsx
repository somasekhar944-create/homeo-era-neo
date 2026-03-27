import React, { useState } from 'react';
import ReactDOM from 'react-dom';

function ExamDaySelectionPopup({ onSelect }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const days = [
    { label: 'Sun', full: 'Sunday' },
    { label: 'Mon', full: 'Monday' },
    { label: 'Tue', full: 'Tuesday' },
    { label: 'Wed', full: 'Wednesday' },
    { label: 'Thu', full: 'Thursday' },
    { label: 'Fri', full: 'Friday' },
    { label: 'Sat', full: 'Saturday' }
  ];

  const getNextDateForDay = (dayName) => {
    if (!dayName) return null;
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDay = daysOfWeek.indexOf(dayName);
    const now = new Date();
    let resultDate = new Date(now);
    // Start searching from tomorrow to match backend logic
    resultDate.setDate(now.getDate() + 1);
    while (resultDate.getDay() !== targetDay) {
      resultDate.setDate(resultDate.getDate() + 1);
    }
    return resultDate;
  };

  const nextDate = getNextDateForDay(selectedDay);

  const modalContent = (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4" 
      style={{ 
        zIndex: 999999, 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(15, 23, 42, 0.85)', 
        backdropFilter: 'blur(12px)', 
        pointerEvents: 'auto' 
      }}
    >
      <div 
        className="bg-white rounded-[40px] shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 relative"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-10 text-center bg-gradient-to-br from-teal-700 via-teal-600 to-indigo-800 text-white">
          <div className="w-20 h-20 bg-white/10 rounded-[28px] flex items-center justify-center mx-auto mb-6 border border-white/20">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black mb-2 tracking-tight">Welcome, Doctor!</h2>
          <p className="opacity-80 font-medium text-sm px-6">Select your preferred weekly Exam Day to generate your preparation roadmap.</p>
        </div>
        
        <div className="p-10 bg-white">
          <div className="space-y-8">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-6 text-center">
                Which day works best for your Weekly Mock?
              </label>
              
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                {days.map((day) => (
                  <button
                    key={day.full}
                    onClick={() => {
                      console.log('Selected:', day.full);
                      setSelectedDay(day.full);
                    }}
                    className={`h-12 w-12 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-xs font-black transition-all duration-200 border-2 ${selectedDay === day.full 
                      ? 'bg-teal-500 border-teal-500 text-white shadow-lg shadow-teal-100 scale-110' 
                      : 'bg-white border-gray-100 text-gray-400 hover:border-teal-200 hover:text-teal-600'}`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={!selectedDay}
              onClick={(e) => {
                e.preventDefault();
                if (selectedDay) {
                  console.log('Confirming Roadmap for:', selectedDay);
                  onSelect(selectedDay);
                }
              }}
              style={{ pointerEvents: 'auto', cursor: selectedDay ? 'pointer' : 'not-allowed' }}
              className={`w-full py-5 rounded-[20px] transition-all duration-300 uppercase tracking-widest text-sm font-black shadow-xl ${selectedDay 
                ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-100 active:scale-[0.98]' 
                : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'}`}
            >
              Confirm Selection
            </button>
            
            <div className="bg-teal-50 p-4 rounded-2xl border border-teal-100 flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <span className="text-teal-500 mt-0.5 font-bold">📅</span>
                <p className="text-[11px] text-teal-700 leading-relaxed font-medium">
                  {selectedDay ? (
                    <>
                      Your first exam will be on <span className="font-bold underline text-indigo-700">{nextDate?.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>.
                    </>
                  ) : (
                    'Select a day to see your start date.'
                  )}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-teal-500 mt-0.5 font-bold">💡</span>
                <p className="text-[11px] text-teal-700 leading-relaxed font-medium">
                  Note: Your 24-week roadmap will start from the very next <span className="font-bold underline">{selectedDay || 'selected day'}</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

export default ExamDaySelectionPopup;

