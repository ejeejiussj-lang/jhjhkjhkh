import React, { useState } from 'react';
import { LogIn, Lock, Mail, UserPlus, User, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../lib/supabaseService';

interface WelcomeScreenProps {
  onEnterSystem: (user: UserProfile) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onEnterSystem }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Administrador' | 'Fiscal' | 'Gestor' | 'Auditor'>('Administrador');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const userProf: UserProfile = {
          id: data.user.id,
          email: data.user.email || email,
          name: profile?.name || data.user.user_metadata?.name || email.split('@')[0],
          role: profile?.role || 'Administrador',
        };

        onEnterSystem(userProf);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Falha ao realizar login. Verifique seu e-mail e senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0],
            role,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create or update profile record in database
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          name: name || email.split('@')[0],
          role,
        });

        const userProf: UserProfile = {
          id: data.user.id,
          email,
          name: name || email.split('@')[0],
          role,
        };

        setSuccessMessage('Conta criada com sucesso no Supabase!');
        setTimeout(() => {
          onEnterSystem(userProf);
        }, 1000);
      }
    } catch (err: any) {
      console.error('Register error:', err);
      setErrorMessage(err.message || 'Falha ao criar usuário no Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-100 text-slate-900 flex flex-col items-center justify-center p-6 selection:bg-[#0f5b40] selection:text-white font-sans">
      <div className="w-full max-w-[460px] space-y-8 text-center">
        {/* System Name */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-[#0f5b40]">SIGEC</h1>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.15em]">
              Sistema Integrado de Gestão de Contratos
            </p>
            <div className="w-12 h-0.5 bg-[#8fb3a5] rounded-full"></div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-left">
          {/* Tabs */}
          <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100 mb-8">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-[#0f5b40] shadow-sm border-b-2 border-[#0f5b40]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Entrar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-white text-[#0f5b40] shadow-sm border-b-2 border-[#0f5b40]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Criar Conta</span>
            </button>
          </div>

          {errorMessage && (
            <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium leading-relaxed">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
              {successMessage}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#1e293b] uppercase tracking-wide">
                  E-mail
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-2.5 p-1.5 bg-[#eefcf4] text-[#0f5b40] rounded-lg">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Digite seu e-mail"
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f5b40] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#1e293b] uppercase tracking-wide">
                  Senha
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-2.5 p-1.5 bg-[#eefcf4] text-[#0f5b40] rounded-lg">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f5b40] focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-4 h-4">
                    <input 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="appearance-none w-4 h-4 bg-white border-2 border-[#0f5b40] rounded-sm checked:bg-[#0f5b40] transition-colors cursor-pointer" 
                    />
                    {rememberMe && <svg className="absolute w-3 h-3 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">Lembrar-me</span>
                </label>
                <a href="#" className="text-xs font-bold text-[#0f5b40] hover:underline">
                  Esqueci minha senha
                </a>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#0a6c4c] hover:bg-[#075239] text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{loading ? 'Entrando...' : 'Entrar'}</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#1e293b] uppercase tracking-wide">
                  Nome Completo
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-2.5 p-1.5 bg-[#eefcf4] text-[#0f5b40] rounded-lg">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f5b40] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#1e293b] uppercase tracking-wide">
                  E-mail
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-2.5 p-1.5 bg-[#eefcf4] text-[#0f5b40] rounded-lg">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="novo.usuario@orgao.sp.gov.br"
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f5b40] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#1e293b] uppercase tracking-wide">
                  Senha
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-2.5 p-1.5 bg-[#eefcf4] text-[#0f5b40] rounded-lg">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="•••••••• (mínimo 6 caracteres)"
                    className="w-full pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f5b40] focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#0a6c4c] hover:bg-[#075239] text-white font-medium text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{loading ? 'Cadastrando...' : 'Criar Conta'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 font-medium">ou</span>
            </div>
          </div>

          {/* Security Note */}
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-[#0f5b40]" />
            <span className="text-xs font-medium">Seus dados estão protegidos com segurança.</span>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-slate-500 font-medium">
          SIGEC © {new Date().getFullYear()} — Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};
