import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function SignupPage({ setUser }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (setUser) setUser(data.user);
        alert("Account created successfully! Welcome Doctor.");
        navigate('/dashboard');
      } else {
        setError(data.message || 'Signup failed');
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
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Create Account</h2>
          <p className="text-slate-500 font-medium mt-2">Join the Homeo Era PG Training.</p>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-center font-bold text-sm">{error}</div>}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Full Name</label>
            <input
              type="text"
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Dr. John Doe"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Mobile Number</label>
            <input
              type="tel"
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              required
              placeholder="10-digit number"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Email ID (Optional)</label>
            <input
              type="email"
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="dr.name@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Password</label>
            <input
              type="password"
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl hover:bg-black transition-all shadow-xl uppercase tracking-widest disabled:opacity-50 mt-4"
          >
            {loading ? "Creating Account..." : "Sign Up Now"}
          </button>
        </form>

        <p className="text-center text-slate-500 mt-8 font-medium">
          Already have an account? <Link to="/login" className="text-indigo-600 font-black hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;

