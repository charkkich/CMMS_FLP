import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EyeIcon, EyeSlashIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type Tab = 'login' | 'register';

const QUICK_LOGINS = [
  { label: 'Admin',         email: 'admin@cmms.local',       color: 'bg-red-500' },
  { label: 'Supervisor',    email: 'supervisor@cmms.local',  color: 'bg-blue-500' },
  { label: 'ช่าง 1 (Mike)', email: 'tech@cmms.local',        color: 'bg-green-500' },
  { label: 'ช่าง 2 (Somsak)',email: 'tech2@cmms.local',      color: 'bg-green-600' },
  { label: 'คลังพัสดุ',     email: 'storekeeper@cmms.local', color: 'bg-amber-500' },
  { label: 'Requester',     email: 'requester@cmms.local',   color: 'bg-gray-400' },
];

const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>('login');

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // Register state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regDept, setRegDept] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim()) { toast.error('กรุณากรอกชื่อ-นามสกุล'); return; }
    if (regPassword.length < 6) { toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return; }
    if (regPassword !== regConfirm) { toast.error('รหัสผ่านไม่ตรงกัน'); return; }
    setRegLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: { data: { full_name: regFullName.trim(), department: regDept, phone: regPhone, role: 'requester' } },
      });
      if (error) throw new Error(error.message);
      toast.success('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
      // Auto switch to login and fill email
      setEmail(regEmail);
      setPassword(regPassword);
      setTab('login');
    } catch (err: any) {
      toast.error(err.message || 'สมัครสมาชิกไม่สำเร็จ');
    } finally { setRegLoading(false); }
  };

  const fill = (e: string) => { setEmail(e); setPassword('Admin@1234'); setTab('login'); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
            <WrenchScrewdriverIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CMMS FLP</h1>
          <p className="text-primary-200 text-sm mt-1">Facility &amp; Farm Maintenance System</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">

          {/* Tab switcher */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {(['login', 'register'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                  tab === t
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {t === 'login' ? '🔑 เข้าสู่ระบบ' : '📝 สมัครสมาชิก'}
              </button>
            ))}
          </div>

          <div className="p-8">
            {/* ─── LOGIN ─── */}
            {tab === 'login' && (
              <>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">อีเมล</label>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      className="input-field" placeholder="email@example.com" required autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รหัสผ่าน</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'} value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="input-field pr-10" placeholder="••••••••" required
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold rounded-xl transition-colors">
                    {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                  </button>
                </form>

                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                  ยังไม่มีบัญชี?{' '}
                  <button onClick={() => setTab('register')} className="text-primary-600 hover:underline font-medium">
                    สมัครสมาชิก
                  </button>
                </p>

                {/* Quick Login */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    Quick Login (Demo)
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {QUICK_LOGINS.map(({ label, email: e, color }) => (
                      <button
                        key={e} type="button" onClick={() => fill(e)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                    รหัสผ่าน: <span className="font-mono font-semibold">Admin@1234</span>
                  </p>
                </div>
              </>
            )}

            {/* ─── REGISTER ─── */}
            {tab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ชื่อ-นามสกุล <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" value={regFullName} onChange={e => setRegFullName(e.target.value)}
                    className="input-field" placeholder="กรอกชื่อ-นามสกุล" required autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    อีเมล <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                    className="input-field" placeholder="email@example.com" required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      รหัสผ่าน <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPw ? 'text' : 'password'} value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        className="input-field pr-8" placeholder="••••••" required minLength={6}
                      />
                      <button type="button" onClick={() => setShowRegPw(!showRegPw)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showRegPw ? <EyeSlashIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)}
                      className={`input-field ${regConfirm && regConfirm !== regPassword ? 'border-red-400' : ''}`}
                      placeholder="••••••" required
                    />
                    {regConfirm && regConfirm !== regPassword && (
                      <p className="text-xs text-red-500 mt-1">รหัสผ่านไม่ตรงกัน</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">แผนก</label>
                    <input
                      type="text" value={regDept} onChange={e => setRegDept(e.target.value)}
                      className="input-field" placeholder="เช่น ซ่อมบำรุง"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เบอร์โทร</label>
                    <input
                      type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)}
                      className="input-field" placeholder="08x-xxx-xxxx"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-semibold mb-1">📋 หมายเหตุ</p>
                  <p>บัญชีใหม่จะได้สิทธิ์ <strong>ผู้แจ้งซ่อม (Requester)</strong> โดยอัตโนมัติ</p>
                  <p>ผู้ดูแลระบบสามารถเปลี่ยนสิทธิ์ได้ภายหลัง</p>
                </div>

                <button
                  type="submit" disabled={regLoading || (!!regConfirm && regConfirm !== regPassword)}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold rounded-xl transition-colors"
                >
                  {regLoading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
                </button>

                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  มีบัญชีแล้ว?{' '}
                  <button onClick={() => setTab('login')} className="text-primary-600 hover:underline font-medium">
                    เข้าสู่ระบบ
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Language switcher */}
        <div className="flex justify-center gap-3 mt-4">
          {[{ code: 'en', label: '🇬🇧 EN' }, { code: 'th', label: '🇹🇭 TH' }].map(({ code, label }) => (
            <button key={code}
              onClick={() => { i18n.changeLanguage(code); localStorage.setItem('language', code); }}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                i18n.language.startsWith(code) ? 'bg-white text-primary-700' : 'text-primary-200 hover:text-white'
              }`}
            >{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
