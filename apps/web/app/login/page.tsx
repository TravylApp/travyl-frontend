'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ArrowLeft, Send, Mail, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore, LOGIN_DESTINATIONS, PAPER_PLANE_VIEWBOX, PAPER_PLANE_PATHS } from '@travyl/shared';
import { Footer, OceanWave } from '@/components/home';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);

  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    setError('');
    try {
      if (isSignUp) {
        await signUp(email, password, name || undefined);
      } else {
        await signIn(email, password);
      }
      router.replace('/');
    } catch (err: any) {
      setError(err.message ?? (isSignUp ? 'Sign up failed.' : 'Sign in failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  const nextPage = () => setCurrentPage((p) => (p + 1) % LOGIN_DESTINATIONS.length);
  const prevPage = () => setCurrentPage((p) => (p - 1 + LOGIN_DESTINATIONS.length) % LOGIN_DESTINATIONS.length);
  const dest = LOGIN_DESTINATIONS[currentPage];

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 flex">
      {/* Left Panel — Magazine Carousel */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-black">
        <AnimatePresence mode="wait">
          <motion.div
            key={`image-${currentPage}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <img src={dest.image} alt={dest.name} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/70" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* TRAVYL Branding */}
        <div className="absolute top-12 left-12 z-10 pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-black text-2xl tracking-[2px]">TRAVYL</span>
            <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
              <svg viewBox={PAPER_PLANE_VIEWBOX} className="w-4 h-4 -rotate-12" fill="none">
                {PAPER_PLANE_PATHS.map((d, i) => (
                  <path key={i} d={d} fill="white" />
                ))}
              </svg>
            </div>
          </div>
          <p className="text-white/40 text-[10px] tracking-[2px] uppercase">March 2026 &bull; Issue 024</p>
        </div>

        {/* Text Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`text-${currentPage}`}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.4, ease: [0.43, 0.13, 0.23, 0.96] }}
            className="absolute bottom-12 left-12 max-w-[550px] pointer-events-none"
          >
            <h1 className="text-white font-serif text-[80px] xl:text-[100px] 2xl:text-[120px] leading-[0.85] tracking-tighter mb-3">
              {dest.name}
            </h1>
            <p className="text-white/60 text-lg xl:text-xl tracking-[4px] uppercase mb-5">
              {dest.country}
            </p>
            <p className="text-white font-serif italic text-2xl mb-8">
              {dest.tagline}
            </p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {dest.highlights.map((h, i) => (
                <div key={i}>
                  <div className="text-[#d4af37] font-bold text-xs mb-0.5">0{i + 1}</div>
                  <div className="text-white/80 text-sm leading-tight">{h}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-8">
              <div>
                <p className="text-white/40 text-[9px] tracking-[2px] uppercase mb-1">Best Time</p>
                <p className="text-white text-sm font-medium">{dest.bestTime}</p>
              </div>
              <div>
                <p className="text-white/40 text-[9px] tracking-[2px] uppercase mb-1">Vibe</p>
                <p className="text-white text-sm font-medium">{dest.vibe}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-6 z-20">
          <motion.button
            onClick={prevPage}
            className="w-10 h-10 rounded-full backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-xl"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </motion.button>

          <div className="flex gap-3">
            {LOGIN_DESTINATIONS.map((d, i) => (
              <motion.button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`relative h-2 rounded-full transition-all duration-500 group/dot ${
                  i === currentPage ? 'w-12 bg-white' : 'w-2 bg-white/30 hover:bg-white/60'
                }`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                {i !== currentPage && (
                  <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-white/90 backdrop-blur text-[#1e3a5f] text-xs font-semibold rounded-lg opacity-0 group-hover/dot:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {d.name}
                  </span>
                )}
              </motion.button>
            ))}
          </div>

          <motion.button
            onClick={nextPage}
            className="w-10 h-10 rounded-full backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-xl"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* Page Counter */}
        <div className="absolute top-12 right-12 text-white/60 text-sm font-light tracking-[3px] z-10 pointer-events-none">
          <span className="text-white font-semibold">{String(currentPage + 1).padStart(2, '0')}</span>
          <span className="mx-2">/</span>
          <span>{String(LOGIN_DESTINATIONS.length).padStart(2, '0')}</span>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="w-full lg:w-[520px] flex flex-col bg-[#f8f6f3] shadow-2xl">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between p-4">
          <button onClick={() => router.push('/')} className="p-2 -ml-2 text-[#1e3a5f] hover:bg-[#1e3a5f]/5 rounded-lg transition-colors">
            <ArrowLeft size={22} />
          </button>
          <span className="text-[#1e3a5f] font-black text-xl tracking-[1.5px]">TRAVYL</span>
          <div className="w-[38px]" />
        </div>

        <div className="flex-1 flex items-center justify-center px-10 py-8 overflow-y-auto">
          <div className="w-full max-w-[440px]">
            {/* Back button — Desktop */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              onClick={() => router.push('/')}
              className="hidden lg:flex items-center gap-2 text-[#1e3a5f]/60 hover:text-[#1e3a5f] transition-colors mb-8 text-sm group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Back to Discover
            </motion.button>

            {/* Heading */}
            <AnimatePresence mode="wait">
              <motion.div
                key={isSignUp ? 'signup' : 'login'}
                initial={{ opacity: 0, x: isSignUp ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isSignUp ? -20 : 20 }}
                transition={{ duration: 0.3 }}
                className="mb-7"
              >
                <h2 className="text-[#1e3a5f] text-[22px] font-black tracking-tight mb-2">
                  {isSignUp ? 'Create your account' : 'Welcome back'}
                </h2>
                <p className="text-[#1e3a5f]/50 text-sm">
                  {isSignUp ? 'Start planning your dream trips today.' : 'Sign in to continue your journey.'}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Error */}
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 mb-4">{error}</p>
            )}

            {/* Social login */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                {
                  label: 'Google',
                  icon: (
                    <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  ),
                },
                {
                  label: 'Facebook',
                  icon: (
                    <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="#1877F2">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  ),
                },
                {
                  label: 'Apple',
                  icon: (
                    <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="#1e3a5f">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                  ),
                },
                {
                  label: 'Microsoft',
                  icon: (
                    <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]">
                      <path fill="#f25022" d="M11.4 11.4H2.2V2.2h9.2z" />
                      <path fill="#00a4ef" d="M21.8 11.4h-9.2V2.2h9.2z" />
                      <path fill="#7fba00" d="M11.4 21.8H2.2v-9.2h9.2z" />
                      <path fill="#ffb900" d="M21.8 21.8h-9.2v-9.2h9.2z" />
                    </svg>
                  ),
                },
              ].map((provider) => (
                <motion.button
                  key={provider.label}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-2.5 h-[56px] rounded-xl border border-[#1e3a5f]/10 bg-white hover:bg-[#1e3a5f]/[0.03] hover:border-[#1e3a5f]/20 hover:shadow-lg transition-all text-[#1e3a5f] text-sm cursor-pointer"
                >
                  {provider.icon}
                  {provider.label}
                </motion.button>
              ))}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-[#1e3a5f]/10" />
              <span className="text-[#1e3a5f]/30 text-xs tracking-wider uppercase">or</span>
              <div className="flex-1 h-px bg-[#1e3a5f]/10" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence>
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="relative">
                      <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'name' ? 'text-[#1e3a5f]' : 'text-[#1e3a5f]/30'}`}>
                        <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        className="w-full h-[56px] pl-11 pr-4 rounded-xl border border-[#1e3a5f]/10 bg-white text-[#1e3a5f] placeholder:text-[#1e3a5f]/30 focus:outline-none focus:border-[#1e3a5f]/40 focus:ring-2 focus:ring-[#1e3a5f]/10 transition-all text-sm"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div className="relative">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'email' ? 'text-[#1e3a5f]' : 'text-[#1e3a5f]/30'}`}>
                  <Mail size={17} />
                </div>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full h-[56px] pl-11 pr-4 rounded-xl border border-[#1e3a5f]/10 bg-white text-[#1e3a5f] placeholder:text-[#1e3a5f]/30 focus:outline-none focus:border-[#1e3a5f]/40 focus:ring-2 focus:ring-[#1e3a5f]/10 transition-all text-sm"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'password' ? 'text-[#1e3a5f]' : 'text-[#1e3a5f]/30'}`}>
                  <Lock size={17} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full h-[56px] pl-11 pr-12 rounded-xl border border-[#1e3a5f]/10 bg-white text-[#1e3a5f] placeholder:text-[#1e3a5f]/30 focus:outline-none focus:border-[#1e3a5f]/40 focus:ring-2 focus:ring-[#1e3a5f]/10 transition-all text-sm"
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#1e3a5f]/30 hover:text-[#1e3a5f]/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </motion.button>
              </div>

              {!isSignUp && (
                <div className="flex justify-end">
                  <button type="button" className="text-[#1e3a5f]/50 hover:text-[#1e3a5f] hover:underline text-xs transition-all">
                    Forgot password?
                  </button>
                </div>
              )}

              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full h-[56px] rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#2a4d78] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#1e3a5f]/20 hover:shadow-xl hover:shadow-[#1e3a5f]/30 disabled:opacity-50"
              >
                {submitting ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
                <Send size={16} className="-rotate-12" />
              </motion.button>
            </form>

            {/* Toggle */}
            <p className="text-center mt-6 text-sm text-[#1e3a5f]/40">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[#1e3a5f] font-semibold hover:underline underline-offset-2 transition-colors"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>

            <p className="text-center mt-4 text-[10px] text-[#1e3a5f]/25 leading-relaxed">
              By continuing, you agree to Travyl&apos;s{' '}
              <span className="underline cursor-pointer hover:text-[#1e3a5f]/40">Terms of Service</span>{' '}
              and{' '}
              <span className="underline cursor-pointer hover:text-[#1e3a5f]/40">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </div>
      </div>
      <OceanWave />
      <Footer />
    </div>
  );
}
