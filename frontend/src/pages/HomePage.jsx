import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/logo.png';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { AlertCircle, TrendingUp, Award, BookOpen, ChevronRight, Sparkles, Trophy, Medal, Timer, Calendar as FaCalendarAlt, User } from 'lucide-react';

function HomePage() {
  const [performance, setPerformance] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardType, setLeaderboardType] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Get dynamic name from localStorage
  const studentName = localStorage.getItem('userName') || "Somasekhar";

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const perfRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/analytics/performance`, getAuthHeaders());
        setPerformance(perfRes.data);
        
        // Fetch initial leaderboard (weekly for the current week found in performance)
        const currentWeek = perfRes.data.currentWeek || 1;
        const leaderRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/analytics/leaderboard/${currentWeek}`, getAuthHeaders());
        setLeaderboard(leaderRes.data);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const switchLeaderboard = async (type) => {
    setLeaderboardType(type);
    try {
      const url = type === 'weekly' 
        ? `${import.meta.env.VITE_API_URL}/api/analytics/leaderboard/${performance?.currentWeek || 1}`
        : `${import.meta.env.VITE_API_URL}/api/analytics/leaderboard-monthly`;
      const res = await axios.get(url, getAuthHeaders());
      setLeaderboard(res.data);
    } catch (err) {
      console.error("Error switching leaderboard:", err);
    }
  };

  if (loading) return <div className="p-12 text-center font-bold">Personalizing your dashboard...</div>;

  const motivationalQuote = performance?.motivationalQuote || "Your potential is unlimited, Doctor. Let's keep moving forward!";
  const lowSubjects = performance?.strengthData?.filter(s => s.percentage < 50) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10 animate-fadeIn">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-8">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-2xl border-2 border-indigo-50 transform group-hover:scale-105 transition-transform duration-300 p-1.5 overflow-hidden">
              <img src={logo} alt="Homeo Era Neo" className="w-full h-full object-contain scale-110" />
            </div>
            <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center z-10">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                Homeo Era Neo
              </span>
              <span className="text-slate-400 ml-3 text-lg md:text-2xl font-medium tracking-widest uppercase opacity-60 block md:inline">
                Sri Surya AI Mentor
              </span>
            </h1>
            <p className="text-xl text-slate-500 font-bold flex items-center gap-2">
              Welcome back, <span className="text-indigo-600">Dr. {studentName}</span>!
            </p>
          </div>
        </div>
        
        {/* Dynamic Rank Section */}
        <div className="flex gap-4">
          <div className={`px-6 py-4 rounded-3xl border-2 flex flex-col items-center justify-center min-w-[140px] transition-all ${performance?.weeklyRank <= 10 ? 'bg-green-50 border-green-200 shadow-lg shadow-green-100' : 'bg-blue-50 border-blue-200'}`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Weekly Rank</span>
            <span className={`text-3xl font-black ${performance?.weeklyRank <= 10 ? 'text-green-600' : 'text-blue-600'}`}>
              #{performance?.weeklyRank || 'N/A'}
            </span>
          </div>
          <div className={`px-6 py-4 rounded-3xl border-2 flex flex-col items-center justify-center min-w-[140px] transition-all ${performance?.monthlyRank <= 10 ? 'bg-amber-50 border-amber-200 shadow-lg shadow-amber-100' : 'bg-teal-50 border-teal-200'}`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Monthly Rank</span>
            <span className={`text-3xl font-black ${performance?.monthlyRank <= 10 ? 'text-amber-600' : 'text-teal-600'}`}>
              #{performance?.monthlyRank || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Encouragement Message */}
      {performance?.weeklyRank > 10 && performance?.marksAwayFromTop10 > 0 && (
        <div className="bg-blue-600 text-white px-8 py-4 rounded-2xl shadow-xl flex items-center justify-between animate-pulse">
          <p className="font-bold text-lg flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber-300" />
            You are just <span className="text-2xl font-black">{performance.marksAwayFromTop10}</span> marks away from Top 10! Keep pushing!
          </p>
          <button onClick={() => navigate('/pg-training')} className="bg-white text-blue-600 px-6 py-2 rounded-xl font-black text-sm hover:bg-blue-50 transition-colors">
            Boost Score Now
          </button>
        </div>
      )}

      {/* Personalized AI Motivational Quote Box */}
      <div className="bg-gradient-to-br from-indigo-700 via-blue-800 to-slate-900 p-12 rounded-[48px] shadow-3xl text-white relative overflow-hidden border-t border-white/10">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="px-4 py-1.5 bg-white/10 rounded-full backdrop-blur-md border border-white/20">
              <span className="uppercase tracking-[0.3em] text-[10px] font-black text-blue-200 flex items-center gap-2">
                <Award className="w-3 h-3" /> Personal AI Insight
              </span>
            </div>
          </div>
          <h2 className="text-3xl md:text-5xl font-black leading-tight max-w-4xl italic tracking-tight">
            "{motivationalQuote}"
          </h2>
        </div>
        <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px]"></div>
      </div>

      {/* Internal Training Roadmap */}
      {performance?.trainingSchedule && performance.trainingSchedule.length > 0 && (
        <div className="bg-white p-10 rounded-[48px] shadow-3xl border border-gray-50 overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <FaCalendarAlt className="text-indigo-600" /> 6-Month Training Roadmap
              </h3>
              <p className="text-slate-500 font-bold ml-9">Track your weekly assessments and milestones.</p>
            </div>
            <button 
              onClick={() => navigate('/ai-settings')}
              className="text-xs font-black text-indigo-600 hover:underline uppercase tracking-widest"
            >
              Adjust Schedule
            </button>
          </div>

          <div className="flex overflow-x-auto pb-6 gap-6 snap-x no-scrollbar">
            {performance.trainingSchedule.map((item, idx) => {
              const examDate = new Date(item.examDate);
              const isToday = examDate.toDateString() === new Date().toDateString();
              const isPast = examDate < new Date() && !isToday;
              const isCompleted = performance.completedWeeks.includes(item.week);
              
              let status = "Locked";
              let statusColor = "bg-gray-100 text-gray-400";
              if (isCompleted) {
                status = "Completed";
                statusColor = "bg-green-100 text-green-600";
              } else if (isToday) {
                status = "Live Now";
                statusColor = "bg-blue-600 text-white animate-pulse";
              } else if (isPast) {
                status = "Missed";
                statusColor = "bg-red-100 text-red-500";
              }

              const formattedDate = examDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

              return (
                <div 
                  key={idx} 
                  className={`flex-shrink-0 w-72 snap-center p-6 rounded-[32px] border-2 transition-all ${isToday ? 'border-blue-600 bg-blue-50/30 shadow-xl' : isCompleted ? 'border-green-100 bg-green-50/20' : 'border-gray-50 bg-gray-50/30'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${statusColor}`}>
                      {status}
                    </span>
                    {item.isMonthlyMock && (
                      <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase">
                        Grand Mock
                      </span>
                    )}
                  </div>
                  
                  <h4 className="font-black text-slate-800 text-xl mb-1">Week {item.week}</h4>
                  <p className="text-slate-500 font-bold text-sm mb-6">
                    {formattedDate}
                  </p>

                  <div className="space-y-3">
                    <button
                      disabled={!isToday && !isPast && !isCompleted}
                      onClick={() => navigate(`/quiz/week-${item.week}`)}
                      className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isToday ? 'bg-blue-600 text-white shadow-lg' : isCompleted ? 'bg-green-600 text-white' : isPast ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'}`}
                    >
                      {isCompleted ? 'Review Result' : isToday ? 'Start Exam' : isPast ? 'Take Makeup' : 'Locked'}
                    </button>
                    
                    {!isToday && !isPast && !isCompleted && (
                      <p className="text-[10px] text-center font-bold text-indigo-400 uppercase tracking-tighter">
                        Unlocks on {formattedDate.split(',')[0]} at 10:00 AM
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Subject-wise Strength */}
        <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-gray-50">
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-10">
            <BookOpen className="w-6 h-6 text-indigo-600" /> Subject Strength
          </h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={performance?.strengthData || []}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 13, fontWeight: 800 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Proficiency" dataKey="percentage" stroke="#4f46e5" strokeWidth={3} fill="#4f46e5" fillOpacity={0.5} />
                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Growth Trend */}
        <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-gray-50">
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-10">
            <TrendingUp className="w-6 h-6 text-green-600" /> Growth Trend
          </h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performance?.trendData || []}>
                <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} />
                <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }} />
                <Line type="step" dataKey="score" stroke="#6366f1" strokeWidth={5} dot={{ r: 8, fill: '#6366f1', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 12, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Competitive Leaderboard Section */}
      <div className="bg-white p-10 rounded-[48px] shadow-3xl border border-gray-50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="space-y-1">
            <h3 className="text-3xl font-black text-slate-900 flex items-center gap-4">
              <Trophy className="w-8 h-8 text-amber-500" /> Competitive Leaderboard
            </h3>
            <p className="text-slate-500 font-bold ml-12">See how you rank against other PG aspirants!</p>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl self-end">
            <button 
              onClick={() => switchLeaderboard('weekly')}
              className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${leaderboardType === 'weekly' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Weekly
            </button>
            <button 
              onClick={() => switchLeaderboard('monthly')}
              className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${leaderboardType === 'monthly' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-[32px] border border-gray-100 shadow-inner bg-slate-50/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="p-6 text-xs font-black uppercase tracking-widest text-slate-400">Rank</th>
                <th className="p-6 text-xs font-black uppercase tracking-widest text-slate-400">Student Name</th>
                <th className="p-6 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Score</th>
                <th className="p-6 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Time Taken</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, idx) => (
                <tr 
                  key={idx} 
                  className={`border-b border-gray-50 transition-colors ${row.userId === 'guest_user' ? 'bg-indigo-50/80' : 'hover:bg-white'}`}
                >
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      {row.rank === 1 && <Medal className="w-6 h-6 text-amber-400 fill-amber-400" />}
                      {row.rank === 2 && <Medal className="w-6 h-6 text-slate-300 fill-slate-300" />}
                      {row.rank === 3 && <Medal className="w-6 h-6 text-amber-700 fill-amber-700" />}
                      {row.rank > 3 && <span className="w-6 text-center font-black text-slate-300">#{row.rank}</span>}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${row.userId === 'guest_user' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {row.name.charAt(4)}
                      </div>
                      <span className={`font-black text-lg ${row.userId === 'guest_user' ? 'text-indigo-900' : 'text-slate-700'}`}>
                        {row.name}
                      </span>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <span className="inline-block px-4 py-1.5 bg-slate-900 text-white font-black rounded-lg text-lg shadow-lg shadow-slate-200">
                      {row.score}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2 text-slate-400 font-bold">
                      <Timer className="w-4 h-4" /> {row.timeTaken}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Smart Alert Box */}
      {lowSubjects.length > 0 && (
        <div className="bg-rose-50/50 border-2 border-rose-100 p-8 rounded-[32px] flex items-start gap-6 relative overflow-hidden group">
          <div className="bg-rose-500 p-4 rounded-2xl text-white shadow-lg shadow-rose-200 group-hover:scale-110 transition-transform">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="relative z-10">
            <h4 className="text-xl font-black text-rose-900 mb-2 tracking-tight">Personalized Focus Alerts</h4>
            <div className="space-y-3">
              {lowSubjects.map((s, i) => (
                <p key={i} className="text-rose-700 text-lg font-bold">
                  Focus Alert: <span className="underline decoration-rose-300 decoration-4 underline-offset-4">{s.subject}</span> is below 50%. 
                  AI suggests 50+ practice questions on standard Aphorisms!
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Training Module Link */}
      <div 
        onClick={() => navigate('/pg-training')}
        className="group cursor-pointer bg-white p-10 rounded-[48px] shadow-2xl border-4 border-transparent hover:border-indigo-600/20 transition-all duration-500 flex items-center justify-between"
      >
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 bg-indigo-100 rounded-[28px] flex items-center justify-center group-hover:bg-indigo-600 group-hover:rotate-[360deg] transition-all duration-700">
            <Award className="w-10 h-10 text-indigo-600 group-hover:text-white" />
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">6-Month PG Roadmap</h3>
            <p className="text-lg text-slate-500 font-bold opacity-80 group-hover:text-indigo-600 transition-colors">Start or continue your current week's target now.</p>
          </div>
        </div>
        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 group-hover:translate-x-2">
          <ChevronRight className="w-8 h-8" />
        </div>
      </div>
    </div>
  );
}

export default HomePage;

