import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const fill = (e: string) => { setEmail(e); setPassword('Admin@1234'); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
            <span className="text-3xl">🔧</span>
          </div>
          <h1 className="text-2xl font-bold text-white">CMMS FLP</h1>
          <p className="text-primary-200 text-sm mt-1">Facility &amp; Farm Maintenance System</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Sign In</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-field" placeholder="admin@cmms.local" required autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-xl transition-colors">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Quick Login</p>
            <div className="space-y-1.5">
              {[
                { label: '🔴 Admin',      email: 'admin@cmms.local' },
                { label: '🔵 Supervisor', email: 'supervisor@cmms.local' },
                { label: '🟢 Technician', email: 'tech@cmms.local' },
                { label: '⚪ Requester',  email: 'requester@cmms.local' },
              ].map(({ label, email: e }) => (
                <button key={e} type="button" onClick={() => fill(e)}
                  className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
                  <span className="text-xs text-gray-400 group-hover:text-primary-600 font-mono">{e}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Password: <span className="font-mono font-semibold">Admin@1234</span></p>
          </div>
        </div>

        <div className="flex justify-center gap-3 mt-4">
          {[{ code: 'en', label: '🇬🇧 EN' }, { code: 'th', label: '🇹🇭 TH' }].map(({ code, label }) => (
            <button key={code} onClick={() => { i18n.changeLanguage(code); localStorage.setItem('language', code); }}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                i18n.language.startsWith(code) ? 'bg-white text-primary-700' : 'text-primary-200 hover:text-white'
              }`}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
