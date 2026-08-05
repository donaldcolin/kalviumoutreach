import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import greekManImg from '../assets/greek man.png';

export default function Login() {
  const { login, isAuthenticated, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex w-full bg-white selection:bg-red-500 selection:text-white font-sans">

      {/* Left Column - Form */}
      <div className="w-full lg:w-1/2 flex flex-col relative z-10 bg-white">

        {/* Logo - Top Left */}
        <div className="absolute top-0 left-0 p-8 md:p-12 z-20 animate-in fade-in slide-in-from-top-4 duration-700">
          <img src="/LOGO.png" alt="Kalvium" className="h-8 md:h-10 object-contain" />
        </div>

        {/* Login Form Container - Centered */}
        <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <div className="w-full max-w-[420px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-8 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <Input
                  id="email"
                  type="email"
                  required
                  className="h-14 bg-white border-gray-200 focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:border-gray-400 transition-all duration-300 placeholder:text-gray-400 rounded-xl px-5 text-[15px] shadow-sm hover:border-gray-300"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Input
                  id="password"
                  type="password"
                  required
                  className="h-14 bg-white border-gray-200 focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:border-gray-400 transition-all duration-300 placeholder:text-gray-400 rounded-xl px-5 text-[15px] shadow-sm hover:border-gray-300"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 mt-6 flex items-center justify-center gap-2 text-[15px] font-medium rounded-xl bg-[#1c1c1c] text-white hover:bg-black transition-all duration-300 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed group active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Login</span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer Text - Bottom Left */}
        <div className="p-8 md:p-12 lg:px-24 pb-12 relative z-10 animate-in fade-in duration-1000 delay-300 fill-mode-both mt-auto">
          <div className="max-w-[420px] mx-auto">
            <h3 className="text-[15px] font-bold text-gray-900 mb-2 italic tracking-tight">Empowering Futures</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed max-w-[320px]">
              Find the best Computer Science colleges matching your potential. Powered by real TNEA data.
            </p>
          </div>
        </div>

      </div>

      {/* Right Column - Image */}
      <div className="hidden lg:block lg:w-1/2 relative bg-[#F4F4F5] overflow-hidden">
        {/* The Greek Man Image */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
          <img
            src={greekManImg}
            alt="Classical statue with laptop"
            className="w-full h-full object-cover object-[center_30%] animate-in fade-in zoom-in-[1.02] duration-1000 ease-out"
          />
          {/* Refined gradient overlay for dramatic lighting and text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Quote */}
        <div className="absolute bottom-12 left-0 right-0 px-12 md:px-16 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 fill-mode-both">
          <div className="max-w-xl mx-auto flex flex-col gap-2">
            <p className="text-white/95 text-[22px] font-medium tracking-wide drop-shadow-md leading-relaxed">
              "The roots of education are bitter, but the fruit is sweet" — Aristotle
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
