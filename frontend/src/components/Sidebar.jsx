import { FaHome, FaFileAlt, FaQuestion, FaGraduationCap, FaCog, FaUpload, FaUsers, FaSignOutAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

function Sidebar({ menuItems, userRole, onLogout }) {
  const isAdmin = userRole === 'Admin';

  return (
    <aside
      className="w-64 bg-white shadow-2xl flex flex-col border-r border-slate-200 z-10 fixed inset-y-0 left-0"
    >
      {/* User Info & Logout */}
      <div className="p-6 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
            {isAdmin ? "A" : "S"}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</p>
            <p className="text-sm font-bold text-slate-700">{userRole}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100 transition-all"
        >
          <FaSignOutAlt /> Logout
        </button>
      </div>

      {/* App Header */}
      <div className="p-8 bg-gradient-to-br from-indigo-700 to-blue-900 text-white">
        <h1 className="text-2xl font-black tracking-tighter italic uppercase">HOMEO ERA NEO</h1>
        <p className="text-[10px] font-bold opacity-70 uppercase tracking-[2px]">Sri Surya AI Mentor</p>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-5 overflow-y-auto">
        <div className="grid gap-2">
          {menuItems.map((item) => (
            (item.role === "both" || (item.role === "admin" && isAdmin)) && (
              <Link 
                key={item.to} 
                to={item.to} 
                className={`flex items-center gap-4 p-4 bg-white border-l-4 ${item.color} rounded-r-xl shadow-sm hover:shadow-md hover:bg-slate-50 transition-all group`}
              >
                <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
                <span className="font-bold text-slate-700 tracking-tight text-sm">{item.label}</span>
              </Link>
            )
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t bg-slate-50 text-[10px] text-center text-slate-400 font-bold">
        NEO-FLASH VERSION 2.5
      </div>
    </aside>
  );
}

export default Sidebar;

