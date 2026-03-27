import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { FaHome, FaFileAlt, FaQuestion, FaBookOpen, FaCog, FaBars, FaUpload, FaUsers, FaGraduationCap } from 'react-icons/fa';
import logo from '../assets/logo.png';

function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'Student');
  const navigate = useNavigate();

  useEffect(() => {
    if (!userRole) {
      navigate('/login');
    }
  }, [userRole, navigate]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  const sidebarItems = {
    Admin: [
      { name: 'Home', icon: <FaHome />, path: '/' },
      { name: 'Upload Books', icon: <FaUpload />, path: '/upload-books' },
      { name: 'User Management', icon: <FaUsers />, path: '/user-management' },
      { name: 'AI Settings', icon: <FaCog />, path: '/ai-settings' },
    ],
    Student: [
      { name: 'Home', icon: <FaHome />, path: '/' },
      { name: 'AI Notes', icon: <FaFileAlt />, path: '/ai-notes' },
      { name: 'Quiz', icon: <FaQuestion />, path: '/quiz' },
      { name: '6-Month PG Training', icon: <FaGraduationCap />, path: '/pg-training' },
      { name: 'AI Settings', icon: <FaCog />, path: '/ai-settings' },
    ],
  };

  const currentSidebarItems = sidebarItems[userRole];

  return (
    <div className="flex h-screen bg-backgroundLight">
      {/* Sidebar */}
      <aside
        className={`transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 bg-primary text-white w-64 p-5 space-y-6 flex flex-col justify-between
          fixed inset-y-0 left-0 z-30 transition-transform duration-200 ease-in-out`}
      >
        <div>
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="Homeo Era Neo" className="h-[40px] w-auto mb-2" />
          </div>
          <nav>
            {currentSidebarItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="flex items-center space-x-2 py-2 px-3 rounded-md hover:bg-blue-700"
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 py-2 px-3 rounded-md hover:bg-blue-700 w-full"
        >
          <FaBookOpen />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col ${isSidebarOpen ? 'md:ml-64' : ''} transition-all duration-200 ease-in-out`}>
        {/* Header */}
        <header className="bg-white shadow-md p-4 flex justify-between items-center">
          <button onClick={toggleSidebar} className="text-gray-800 focus:outline-none md:hidden">
            <FaBars className="h-6 w-6" />
          </button>
          <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
          <div></div> {/* Placeholder for right-aligned items */}
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;

