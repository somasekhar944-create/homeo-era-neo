import React, { useState, useEffect } from 'react';
import { FaEye, FaEyeSlash, FaCalendarAlt } from 'react-icons/fa';

function AISettingsPage() {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [saveMessage, setSaveMessage] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [preferredDay, setPreferredDay] = useState('');
  const [rescheduleMessage, setRescheduleMessage] = useState(null);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    const storedKey = localStorage.getItem('geminiApiKey');
    if (storedKey) {
      setGeminiApiKey(storedKey);
    }
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token'); // Get token for profile fetch as well
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user/profile`, { headers }); // Include headers in fetch
      if (response.ok) {
        const data = await response.json();
        setPreferredDay(data.preferredExamDay || '');
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const handleSaveApiKey = () => {
    if (!geminiApiKey.trim()) {
      setSaveMessage("Error: API Key cannot be empty!");
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    localStorage.setItem('geminiApiKey', geminiApiKey);
    setSaveMessage('Success! API Key saved securely');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleReschedule = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/training/update-exam-day`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ preferredDay })
      });
      
      const data = await response.json();
      if (response.ok) {
        setRescheduleMessage({ type: 'success', text: 'Roadmap updated successfully!' });
      } else {
        setRescheduleMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setRescheduleMessage({ type: 'error', text: 'Failed to reschedule. Please try again.' });
    }
    setTimeout(() => setRescheduleMessage(null), 5000);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10">
      <div>
        <h2 className="text-3xl font-black text-gray-900 mb-2">Settings</h2>
        <p className="text-gray-500 font-medium">Manage your AI configurations and training schedule.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* AI API Settings */}
        <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-gray-100 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <FaEye />
            </div>
            <h3 className="text-xl font-bold text-gray-800">AI Configuration</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1" htmlFor="geminiApiKey">
                Gemini API Key
              </label>
              <div className="relative flex items-center">
                <input
                  type={showApiKey ? "text" : "password"}
                  id="geminiApiKey"
                  className="w-full bg-gray-50 border-2 border-gray-100 py-3 px-4 pr-10 rounded-xl text-gray-700 font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all outline-none"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Enter your Gemini API Key"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showApiKey ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            <button
              onClick={handleSaveApiKey}
              className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest text-xs"
            >
              Save API Key
            </button>
            {saveMessage && (
              <p className={`text-center text-sm font-bold animate-fadeIn ${saveMessage.startsWith("Error") ? "text-red-500" : "text-green-500"}`}>
                {saveMessage}
              </p>
            )}
          </div>
        </div>

        {/* Training Scheduler Settings */}
        <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-gray-100 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <FaCalendarAlt />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Exam Discipline</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                Weekly Exam Day
              </label>
              <select
                value={preferredDay}
                onChange={(e) => setPreferredDay(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 py-3 px-4 rounded-xl text-gray-800 font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all outline-none"
              >
                <option value="" disabled>Select a day</option>
                {days.map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleReschedule}
              className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-lg shadow-gray-200 uppercase tracking-widest text-xs"
            >
              Reschedule Exam Day
            </button>

            {rescheduleMessage && (
              <div className={`p-4 rounded-2xl text-xs font-bold border ${rescheduleMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                {rescheduleMessage.text}
              </div>
            )}
            
            <p className="text-[10px] text-gray-400 font-bold leading-tight px-1">
              Note: Rescheduling resets your 6-month roadmap and is restricted to once every 30 days to maintain preparation discipline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AISettingsPage;

