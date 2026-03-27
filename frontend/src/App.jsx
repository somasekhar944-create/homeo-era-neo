import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';

// Import react-icons
import { FaHome, FaFileAlt, FaQuestion, FaGraduationCap, FaUpload, FaUsers, FaCog, FaArchive } from 'react-icons/fa';

// Import Page Components
import HomePage from './pages/HomePage.jsx';
import AINotesPage from './pages/AINotes/AINotesPage.jsx';
import QuizPage from './pages/QuizPage.jsx';
import PGTrainingPage from './pages/PGTrainingPage.jsx';
import RevisionVaultPage from './pages/RevisionVaultPage.jsx';
import UploadBooksPage from './pages/UploadBooksPage.jsx';
import UserManagementPage from './pages/UserManagementPage.jsx';
import AISettingsPage from './pages/AISettingsPage.jsx';
import WeeklyAssessmentResult from './pages/WeeklyAssessmentResult.jsx';
import LoginPage from './pages/Auth/LoginPage.jsx';
import SignupPage from './pages/Auth/SignupPage.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Navigation Links Data
  const menuItems = [
    { to: "/", icon: <FaHome />, label: "Dashboard", role: "both", color: "border-blue-500" },
    { to: "/ai-notes", icon: <FaFileAlt />, label: "AI Notes", role: "both", color: "border-emerald-500" },
    { to: "/quiz", icon: <FaQuestion />, label: "Quiz Section", role: "both", color: "border-orange-500" },
    { to: "/pg-training", icon: <FaGraduationCap />, label: "PG Training", role: "both", color: "border-purple-500" },
    { to: "/revision-vault", icon: <FaArchive />, label: "Revision Vault", role: "both", color: "border-amber-500" },
    { to: "/upload-books", icon: <FaUpload />, label: "Upload Books", role: "admin", color: "border-rose-500" },
    { to: "/user-management", icon: <FaUsers />, label: "Manage Users", role: "admin", color: "border-cyan-500" },
    { to: "/ai-settings", icon: <FaCog />, label: "AI Settings", role: "admin", color: "border-slate-500" },
  ];

  if (loading) return null;

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage setUser={setUser} />} />
          <Route path="/signup" element={<SignupPage setUser={setUser} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <div className="flex h-screen bg-slate-100 font-sans text-slate-800">
        
        <Sidebar 
          userRole={user.role === 'admin' ? "Admin" : "Student"}
          menuItems={menuItems} 
          onLogout={handleLogout}
        />

        {/* Main Workspace */}
        <div className="flex-1 p-10 overflow-auto bg-slate-50 ml-64">
          <div className="bg-white rounded-[32px] shadow-2xl min-h-full border border-slate-200 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            <div className="p-10">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/ai-notes" element={<AINotesPage />} />
                <Route path="/quiz" element={<QuizPage />} />
                <Route path="/quiz/:weekId" element={<QuizPage />} />
                <Route path="/results/:examId" element={<WeeklyAssessmentResult />} />
                <Route path="/pg-training" element={<PGTrainingPage />} />
                <Route path="/revision-vault" element={<RevisionVaultPage />} />
                <Route path="/upload-books" element={<UploadBooksPage />} />
                <Route path="/user-management" element={<UserManagementPage />} />
                <Route path="/ai-settings" element={<AISettingsPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;

