'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { Sparkles, ArrowRight, Github, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let res;
      if (isLogin) {
        res = await authApi.login(email, password);
      } else {
        res = await authApi.register(email, password, email.split('@')[0]);
      }
      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem('refreshToken', res.refreshToken);
      router.replace('/workspace');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Left side - Branding (Hidden on mobile) */}
      <div className="hidden w-1/2 flex-col justify-between bg-[#1E293B] p-12 lg:flex relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-500/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10 flex items-center gap-2.5 font-bold tracking-tight text-2xl text-white">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 flex items-center justify-center">
            <Sparkles size={18} strokeWidth={2.5} className="text-white" />
          </div>
          <span className="text-2xl mt-0.5 tracking-[-0.02em]">PicMagic<span className="text-blue-400">.</span></span>
        </div>
        
        <div className="relative z-10 max-w-md">
          <Badge className="bg-white/10 hover:bg-white/20 text-white border-0 mb-6 px-3 py-1 text-xs">New Update Available</Badge>
          <h1 className="mb-6 text-5xl font-extrabold text-white leading-tight">Create magic with AI instantly.</h1>
          <p className="mb-8 text-lg text-slate-300">Generate stunning images, videos and digital humans in seconds with our powerful platform.</p>
          <div className="flex gap-4 items-center">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#1E293B] bg-slate-700 flex items-center justify-center overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-sm font-bold text-white leading-tight">10,000+ creators</span>
              <span className="text-xs text-slate-400">Join the community</span>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 flex justify-between items-center text-sm text-slate-400">
          <span>© {new Date().getFullYear()} PicMagic</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2 relative">
        <div className="absolute inset-0 bg-white/50 backdrop-blur-3xl"></div>
        
        <div className="w-full max-w-sm relative z-10">
          <div className="mb-10 lg:hidden flex items-center gap-2.5 font-bold tracking-tight justify-center">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 flex items-center justify-center text-white">
              <Sparkles size={22} />
            </div>
            <span className="text-2xl mt-0.5 text-slate-900 tracking-[-0.02em]">PicMagic<span className="text-blue-600">.</span></span>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-slate-500 font-medium">
              {isLogin ? 'Enter your details to access your workspace' : 'Sign up to start creating amazing content'}
            </p>
          </div>

          <div className="mb-6 flex flex-col gap-3">
            <Button variant="outline" className="w-full h-11 border-slate-200 text-slate-700 font-bold shadow-sm rounded-xl hover:bg-slate-50">
              <Github className="mr-2 h-5 w-5" />
              Continue with Github
            </Button>
            <Button variant="outline" className="w-full h-11 border-slate-200 text-slate-700 font-bold shadow-sm rounded-xl hover:bg-slate-50">
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-slate-50 px-4 text-slate-400 font-bold uppercase text-[10px] tracking-wider">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-500 border border-red-100 flex items-center shadow-sm">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Email Address</label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl border-slate-200 bg-white shadow-sm focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary px-4 transition-all"
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">Password</label>
                {isLogin && (
                  <a href="#" className="text-xs font-bold text-primary hover:text-blue-700 transition-colors">Forgot password?</a>
                )}
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11 rounded-xl border-slate-200 bg-white shadow-sm focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary px-4 transition-all"
              />
            </div>
            
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-6 rounded-xl font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all bg-primary hover:bg-blue-700 text-white"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Please wait...
                </div>
              ) : isLogin ? (
                <>Sign in to workspace <ArrowRight size={16} className="ml-2" /></>
              ) : (
                <>Create account <ArrowRight size={16} className="ml-2" /></>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-primary font-bold hover:text-blue-700 hover:underline transition-all"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}