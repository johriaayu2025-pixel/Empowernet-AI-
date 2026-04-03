
import React, { useState } from 'react';
import { ShieldAlert, Mail, Lock, ArrowRight, UserPlus } from 'lucide-react';

const LoginPage: React.FC<{ onLogin: () => void; onLogoClick?: () => void }> = ({ onLogin, onLogoClick }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin) {
      // Signup logic
      const users = JSON.parse(localStorage.getItem('empowernet_users') || '[]');
      if (users.find((u: any) => u.email === email)) {
        setError('User already exists');
        return;
      }
      users.push({ email, name, password });
      localStorage.setItem('empowernet_users', JSON.stringify(users));
      setIsLogin(true);
      alert('Account created! Please login.');
      return;
    } else {
      // Login logic
      const users = JSON.parse(localStorage.getItem('empowernet_users') || '[]');
      const user = users.find((u: any) => u.email === email && u.password === password);
      
      // Allow demo login with any credentials if no users exist yet
      if (user || email === 'demo@empowernet.ai') {
        localStorage.setItem('auth_token', 'jwt_' + Math.random());
        localStorage.setItem('user_profile', JSON.stringify({ email, name: user?.name || 'Demo User' }));
        onLogin();
      } else {
        setError('Invalid credentials');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-10 border border-gray-100">
        <div className="flex flex-col items-center mb-10 translate-y-0 hover:-translate-y-1 transition-transform">
          <div 
            onClick={onLogoClick}
            className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-violet-200 cursor-pointer hover:scale-105 active:scale-95 transition-all"
          >
            <ShieldAlert className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black text-violet-900 cursor-pointer" onClick={onLogoClick}>EmpowerNet</h1>
          <p className="text-gray-500 font-medium">
            {isLogin ? 'Secure access to AI Scam Detection' : 'Create your secure account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100">{error}</div>}
          
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Full Name</label>
              <div className="relative">
                <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe" 
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all" 
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com" 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all" 
              />
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-violet-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-violet-700 shadow-lg shadow-violet-100 active:scale-[0.98] transition-all">
            {isLogin ? 'Login to Dashboard' : 'Create Account'} <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            {isLogin ? "Don't have an account?" : "Already have an account?"} 
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-1 font-bold text-violet-600 hover:underline"
            >
              {isLogin ? 'Sign up for free' : 'Log in here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
