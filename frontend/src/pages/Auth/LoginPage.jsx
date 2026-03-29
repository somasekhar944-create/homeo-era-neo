import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../../assets/logo.png';

function LoginPage({ setUser }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        navigate('/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-10 flex flex-col items-center">
          <img src={logo} alt="Homeo Era Neo Logo" className="h-[80px] w-auto mb-6" />
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">PG Mentor Login</h2>
          <p className="text-slate-500 font-medium mt-2">Sign in to your account</p>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-center font-bold text-sm">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mobile Number / Email</label>
            <input
              type="text"
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="Mobile or Email"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
            <input
              type="password"
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl hover:bg-black transition-all shadow-xl uppercase tracking-widest disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-slate-500 mt-8 font-medium">
          Don't have an account? <Link to="/signup" className="text-indigo-600 font-black hover:underline">Signup Now</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;

